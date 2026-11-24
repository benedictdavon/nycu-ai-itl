"""Read the text out of an uploaded record file (architecture.md §3, Part B).

.txt and .md are read as UTF-8, .pdf with pypdf and .docx with python-docx.
Scanned pages and photos have no text layer, so they come out empty. A text file in
another encoding (for example Big5 from Windows Notepad) cannot be read: save it as UTF-8.
"""

import io
from pathlib import Path

import docx
from pypdf import PdfReader

MAX_FILE_BYTES = 10 * 1024 * 1024
TYPES = (".txt", ".md", ".pdf", ".docx")


class UnsupportedFileType(ValueError):
    """The file is not one of TYPES."""


def extract_text(filename: str, data: bytes) -> str:
    """The file's text, stripped; empty if it has none.

    Raises UnsupportedFileType for other file types, and ValueError if the file is damaged.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in TYPES:
        raise UnsupportedFileType(suffix)
    try:
        if suffix == ".pdf":
            pages = PdfReader(io.BytesIO(data)).pages
            text = "\n\n".join(page.extract_text() or "" for page in pages)
        elif suffix == ".docx":
            document = docx.Document(io.BytesIO(data))
            # Tables count too: records often list their conditions in one.
            lines = [paragraph.text for paragraph in document.paragraphs]
            for table in document.tables:
                lines += [" | ".join(cell.text for cell in row.cells) for row in table.rows]
            text = "\n".join(lines)
        else:
            text = data.decode("utf-8-sig")
    except Exception as exc:  # each library raises its own errors
        raise ValueError(f"{filename} could not be read.") from exc
    return text.strip()
