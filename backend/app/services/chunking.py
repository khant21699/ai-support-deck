def chunk_text(text: str, max_chars: int = 800):
    """Split text into pieces of at most max_chars, keeping paragraphs together where possible."""
    chunks = []
    current = ""

    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(current) + len(paragraph) + 2 <= max_chars:
            current = (current + "\n\n" + paragraph).strip()
        else:
            if current:
                chunks.append(current)
            current = paragraph
    if current:
        chunks.append(current)

    # A single paragraph can still be too long, so cut those into pieces.
    pieces = []
    for chunk in chunks:
        while len(chunk) > max_chars:
            pieces.append(chunk[:max_chars])
            chunk = chunk[max_chars:]
        pieces.append(chunk)
    return pieces
