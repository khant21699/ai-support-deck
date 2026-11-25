"""Check how accurate the triage is.   Run from the backend folder:  python -m evals.run_eval

It sends each ticket in sample_tickets.json to your chat model and compares the answer with
the expected category and priority. Needs your model (Ollama by default) to be running.
"""
import json
import time
from pathlib import Path

from app.services.triage import triage_ticket

TICKETS_FILE = Path(__file__).parent / "sample_tickets.json"


def main():
    tickets = json.loads(TICKETS_FILE.read_text())
    correct = {"category": 0, "priority": 0}
    mistakes = []
    started = time.time()

    for ticket in tickets:
        result = triage_ticket(ticket["subject"], ticket["body"])
        for field in correct:
            if getattr(result, field) == ticket[field]:
                correct[field] += 1
            else:
                mistakes.append((ticket["subject"], field, ticket[field], getattr(result, field)))

    total = len(tickets)
    print(f"{total} tickets in {time.time() - started:.1f}s")
    for field, count in correct.items():
        print(f"{field} accuracy: {count}/{total} = {count / total:.0%}")

    if mistakes:
        print("\nMistakes (subject | field | expected | got):")
        for mistake in mistakes:
            print("  ", " | ".join(mistake))


if __name__ == "__main__":
    main()
