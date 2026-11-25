"""The three kinds of people: anonymous visitors, agents and admins. Uses an in-memory SQLite database."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

from app.core.db import get_db
from app.core.security import hash_password
from app.main import app
from app.models import AiDraft, Message, Ticket, User
from app.routers import tickets as tickets_router

TICKET = {"subject": "Charged twice", "body": "I was charged twice this month.", "customer_email": "sam@example.com"}


@pytest.fixture()
def database(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine, tables=[User.__table__, Ticket.__table__, Message.__table__, AiDraft.__table__])
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    with Session() as db:
        db.add(User(email="admin@example.com", password_hash=hash_password("admin password"), role="admin"))
        db.add(User(email="agent@example.com", password_hash=hash_password("agent password"), role="agent"))
        db.commit()

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(tickets_router, "process_ticket", lambda ticket_id: None)  # no AI in these tests
    yield Session
    app.dependency_overrides.clear()


def visitor():
    return TestClient(app)


def logged_in(email, password):
    client = TestClient(app)
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return client


@pytest.fixture()
def admin(database):
    return logged_in("admin@example.com", "admin password")


@pytest.fixture()
def agent(database):
    return logged_in("agent@example.com", "agent password")


# ---------- anonymous ----------
def test_anonymous_can_only_submit_a_ticket(database):
    anonymous = visitor()
    assert anonymous.post("/tickets", json=TICKET).status_code == 201
    assert anonymous.get("/tickets").status_code == 401
    assert anonymous.get("/dashboard/summary").status_code == 401
    assert anonymous.get("/kb/articles").status_code == 401
    assert anonymous.get("/users").status_code == 401
    assert anonymous.post("/users", json={"email": "x@example.com", "password": "password123"}).status_code == 401


# ---------- agent ----------
def test_agent_can_see_tickets(database, agent):
    visitor().post("/tickets", json=TICKET)
    assert agent.get("/tickets").json()["total"] == 1


def test_agent_cannot_add_agents_or_see_the_team(agent):
    assert agent.post("/users", json={"email": "new@example.com", "password": "password123"}).status_code == 403
    assert agent.get("/users").status_code == 403


def test_agent_cannot_edit_the_knowledge_base(agent):
    article = {"title": "Refund policy", "body": "Refunds take 5 to 10 business days."}
    assert agent.post("/kb/articles", json=article).status_code == 403


# ---------- admin ----------
def test_admin_can_see_tickets_and_open_one(database, admin):
    visitor().post("/tickets", json=TICKET)
    tickets = admin.get("/tickets").json()
    assert tickets["total"] == 1
    assert admin.get(f"/tickets/{tickets['items'][0]['id']}").status_code == 200


def test_admin_can_add_an_agent_who_can_then_log_in(admin):
    created = admin.post("/users", json={"email": "New.Agent@Example.com", "password": "a good password"})
    assert created.status_code == 201
    assert created.json()["role"] == "agent"
    assert created.json()["email"] == "new.agent@example.com"
    assert "password" not in created.text

    new_agent = logged_in("new.agent@example.com", "a good password")
    assert new_agent.get("/auth/me").json()["role"] == "agent"
    assert new_agent.post("/users", json={"email": "again@example.com", "password": "password123"}).status_code == 403


def test_admin_sees_the_whole_team(admin):
    admin.post("/users", json={"email": "second@example.com", "password": "password123"})
    team = admin.get("/users").json()
    assert [(u["email"], u["role"]) for u in team] == [
        ("admin@example.com", "admin"),
        ("agent@example.com", "agent"),
        ("second@example.com", "agent"),
    ]


def test_admin_can_add_another_admin(admin):
    created = admin.post("/users", json={"email": "second.admin@example.com", "password": "a good password", "role": "admin"})
    assert created.status_code == 201
    assert created.json()["role"] == "admin"

    second = logged_in("second.admin@example.com", "a good password")
    assert second.post("/users", json={"email": "x@example.com", "password": "password123"}).status_code == 201


def test_role_defaults_to_agent_and_unknown_roles_are_refused(admin):
    assert admin.post("/users", json={"email": "a@example.com", "password": "password123"}).json()["role"] == "agent"
    bad = admin.post("/users", json={"email": "b@example.com", "password": "password123", "role": "superuser"})
    assert bad.status_code == 422


def test_agent_cannot_make_an_admin(agent):
    body = {"email": "sneaky@example.com", "password": "password123", "role": "admin"}
    assert agent.post("/users", json=body).status_code == 403


# ---------- removing people ----------
def user_id(admin, email):
    return next(u["id"] for u in admin.get("/users").json() if u["email"] == email)


def test_admin_can_remove_an_agent(admin):
    assert admin.delete(f"/users/{user_id(admin, 'agent@example.com')}").status_code == 204
    assert [u["email"] for u in admin.get("/users").json()] == ["admin@example.com"]


def test_a_removed_agent_is_locked_out_straight_away(admin, agent):
    assert agent.get("/tickets").status_code == 200  # signed in
    admin.delete(f"/users/{user_id(admin, 'agent@example.com')}")
    assert agent.get("/tickets").status_code == 401  # the same session no longer works
    login = visitor().post("/auth/login", json={"email": "agent@example.com", "password": "agent password"})
    assert login.status_code == 401


def test_removing_an_agent_keeps_their_tickets(database, admin):
    with database() as db:
        agent_row = db.query(User).filter_by(email="agent@example.com").one()
        db.add(Ticket(subject="Assigned to agent", body="Some body text here.", customer_email="c@example.com",
                      assignee_id=agent_row.id))
        db.commit()
        agent_id = str(agent_row.id)

    assert admin.delete(f"/users/{agent_id}").status_code == 204
    tickets = admin.get("/tickets").json()
    assert tickets["total"] == 1
    assert admin.get(f"/tickets/{tickets['items'][0]['id']}").json()["assignee_id"] is None


def test_admins_cannot_be_removed(admin):
    assert admin.delete(f"/users/{user_id(admin, 'admin@example.com')}").status_code == 403
    assert admin.get("/users").json()[0]["email"] == "admin@example.com"


def test_removing_an_unknown_person_is_a_404(admin):
    assert admin.delete("/users/00000000-0000-0000-0000-000000000000").status_code == 404


def test_only_admins_can_remove_people(database, agent):
    with database() as db:
        other = User(email="other@example.com", password_hash=hash_password("password123"), role="agent")
        db.add(other)
        db.commit()
        other_id = str(other.id)
    assert agent.delete(f"/users/{other_id}").status_code == 403
    assert visitor().delete(f"/users/{other_id}").status_code == 401


def test_adding_an_existing_email_is_refused(admin):
    response = admin.post("/users", json={"email": "AGENT@example.com", "password": "password123"})
    assert response.status_code == 409


def test_weak_or_oversized_passwords_are_refused(admin):
    assert admin.post("/users", json={"email": "a@example.com", "password": "short"}).status_code == 422
    assert admin.post("/users", json={"email": "a@example.com", "password": "x" * 73}).status_code == 422
    assert admin.post("/users", json={"email": "not-an-email", "password": "password123"}).status_code == 422
