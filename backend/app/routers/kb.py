import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, require_admin
from app.llm import LLMError, embed
from app.models import KbArticle, KbChunk, User
from app.schemas import KbArticleIn, KbArticleOut
from app.services.chunking import chunk_text

log = logging.getLogger(__name__)
router = APIRouter(prefix="/kb/articles", tags=["knowledge base"])


def save_chunks(article: KbArticle):
    """Split the article into chunks and embed them so they can be searched."""
    pieces = chunk_text(f"{article.title}\n\n{article.body}")
    try:
        vectors = embed(pieces)
    except LLMError:
        log.warning("Saving '%s' without embeddings (it will not show up in search until `make reindex`)", article.title)
        vectors = [None] * len(pieces)

    article.chunks = [
        KbChunk(ordinal=number, content=piece, embedding=vector)
        for number, (piece, vector) in enumerate(zip(pieces, vectors, strict=False))
    ]


def get_article_or_404(db: Session, article_id: int):
    article = db.get(KbArticle, article_id)
    if not article:
        raise HTTPException(404, "Article not found")
    return article


@router.get("", response_model=list[KbArticleOut])
def list_articles(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(KbArticle).order_by(KbArticle.updated_at.desc())).all()


@router.post("", response_model=KbArticleOut, status_code=201)
def create_article(data: KbArticleIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    article = KbArticle(title=data.title, body=data.body)
    save_chunks(article)
    db.add(article)
    db.commit()
    return article


@router.put("/{article_id}", response_model=KbArticleOut)
def update_article(
    article_id: int,
    data: KbArticleIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    article = get_article_or_404(db, article_id)
    article.title = data.title
    article.body = data.body
    save_chunks(article)
    db.commit()
    return article


@router.delete("/{article_id}", status_code=204)
def delete_article(article_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.delete(get_article_or_404(db, article_id))
    db.commit()
