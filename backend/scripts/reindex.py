"""Re-embed every knowledge base chunk with the embedding model from your settings.

Run this after changing EMBED_PROVIDER, EMBED_MODEL or EMBED_DIM:   python -m scripts.reindex
If the vector size changed, the column is resized first (old vectors are dropped, because
vectors from different models cannot be compared).
"""
from sqlalchemy import select, text

from app.core.config import settings
from app.core.db import SessionLocal
from app.llm import embed
from app.models import KbChunk

BATCH_SIZE = 32


def main():
    db = SessionLocal()
    try:
        # What size is the column right now?
        current_size = db.scalar(
            text("SELECT atttypmod FROM pg_attribute WHERE attrelid = 'kb_chunks'::regclass AND attname = 'embedding'")
        )
        if current_size != settings.embed_dim:
            print(f"Resizing the embedding column from {current_size} to {settings.embed_dim}")
            db.execute(text(f"ALTER TABLE kb_chunks ALTER COLUMN embedding TYPE vector({int(settings.embed_dim)}) USING NULL"))
            db.commit()

        chunk_ids = db.scalars(select(KbChunk.id).order_by(KbChunk.id)).all()
        print(f"Embedding {len(chunk_ids)} chunks with {settings.embed_provider}:{settings.embed_model}")

        for start in range(0, len(chunk_ids), BATCH_SIZE):
            chunks = db.scalars(select(KbChunk).where(KbChunk.id.in_(chunk_ids[start : start + BATCH_SIZE]))).all()
            vectors = embed([chunk.content for chunk in chunks])
            for chunk, vector in zip(chunks, vectors, strict=False):
                chunk.embedding = vector
            db.commit()
            print(f"  {min(start + BATCH_SIZE, len(chunk_ids))}/{len(chunk_ids)}")
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
