import pytest

from app.llm import LLMError
from app.services import triage
from app.services.chunking import chunk_text
from app.services.triage import FALLBACK, triage_ticket

GOOD_ANSWER = {"category": "billing", "priority": "high", "sentiment": "negative"}


def fake_ask_json(*answers):
    """A stand-in for ask_json that returns each answer in turn (or raises it, if it is an error)."""
    answers = list(answers)

    def fake(system, prompt, schema):
        answer = answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    return fake


def test_chunks_are_not_longer_than_max():
    text = "\n\n".join(f"Paragraph {i}. " + "word " * 40 for i in range(10))
    chunks = chunk_text(text, max_chars=400)
    assert len(chunks) > 1
    assert all(len(chunk) <= 400 for chunk in chunks)


def test_very_long_paragraph_is_split():
    chunks = chunk_text("x" * 1000, max_chars=300)
    assert [len(c) for c in chunks] == [300, 300, 300, 100]


def test_triage_returns_the_models_answer(monkeypatch):
    monkeypatch.setattr(triage, "ask_json", fake_ask_json(GOOD_ANSWER))
    result = triage_ticket("Charged twice", "Please refund the duplicate charge.")
    assert result.category == "billing"


def test_triage_retries_after_a_bad_answer(monkeypatch):
    bad_answer = {"category": "not-a-real-category"}
    monkeypatch.setattr(triage, "ask_json", fake_ask_json(bad_answer, GOOD_ANSWER))
    assert triage_ticket("Login", "I cannot log in to my account.").category == "billing"


def test_triage_uses_fallback_when_the_model_keeps_failing(monkeypatch):
    monkeypatch.setattr(triage, "ask_json", fake_ask_json(LLMError("down"), LLMError("down")))
    assert triage_ticket("Hi", "Some long enough ticket body here.") == FALLBACK


@pytest.mark.parametrize("answers", [[GOOD_ANSWER], [LLMError("x"), GOOD_ANSWER]])
def test_triage_succeeds_if_either_attempt_works(monkeypatch, answers):
    monkeypatch.setattr(triage, "ask_json", fake_ask_json(*answers))
    assert triage_ticket("Hi", "Some long enough ticket body here.") == triage.TriageResult(**GOOD_ANSWER)
