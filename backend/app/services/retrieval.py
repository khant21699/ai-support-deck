import re
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.llm import embed


@dataclass
class Hit:
    chunk_id: int
    article_id: int
    article_title: str
    content: str
    similarity: float  # 0 to 1, how close in meaning (0 if found by keywords only)


# Find the 20 chunks whose meaning is closest to the question.
BY_MEANING = text("""
    SELECT c.id, c.article_id, a.title, c.content, 1 - (c.embedding <=> CAST(:vector AS vector)) AS similarity
    FROM kb_chunks c JOIN kb_articles a ON a.id = c.article_id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> CAST(:vector AS vector)
    LIMIT 20
""")

# Find the 20 chunks that contain the most of the question's words.
BY_KEYWORD = text("""
    SELECT c.id, c.article_id, a.title, c.content
    FROM kb_chunks c JOIN kb_articles a ON a.id = c.article_id
    WHERE to_tsvector('english', c.content) @@ to_tsquery('english', :words)
    ORDER BY ts_rank(to_tsvector('english', c.content), to_tsquery('english', :words)) DESC
    LIMIT 20
""")


def search_kb(db: Session, question: str, k: int = 5):
    """Search the knowledge base two ways (meaning and keywords) and merge the results.

    Merging uses Reciprocal Rank Fusion: a chunk earns 1/(60 + position) from each list it
    appears in, so chunks that rank well in both lists end up on top.
    """
    vector = embed([question])[0]
    by_meaning = db.execute(BY_MEANING, {"vector": str(vector)}).all()

    words = set(re.findall(r"[a-z]{4,}", question.lower()))
    by_keyword = db.execute(BY_KEYWORD, {"words": " | ".join(sorted(words)[:20])}).all() if words else []

    hits = {}
    scores = {}
    for position, row in enumerate(by_meaning):
        hits[row.id] = Hit(row.id, row.article_id, row.title, row.content, float(row.similarity))
        scores[row.id] = scores.get(row.id, 0) + 1 / (60 + position)
    for position, row in enumerate(by_keyword):
        hits.setdefault(row.id, Hit(row.id, row.article_id, row.title, row.content, 0))
        scores[row.id] = scores.get(row.id, 0) + 1 / (60 + position)

    best_first = sorted(scores, key=scores.get, reverse=True)
    return [hits[chunk_id] for chunk_id in best_first[:k]]
