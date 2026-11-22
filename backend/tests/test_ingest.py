"""Reading text out of uploaded files (architecture.md §3, Part B). Files are made in the test."""

import io

import docx
import pytest
from pypdf import PdfWriter

from app.ingest.service import UnsupportedFileType, extract_text


def make_pdf(text: str) -> bytes:
    """A one-page PDF with a text layer (pypdf writes no text, so it is built by hand)."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
        b" /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        xref,
    )
    return out


def make_docx(paragraph: str, row: list[str]) -> bytes:
    document = docx.Document()
    document.add_paragraph(paragraph)
    cells = document.add_table(rows=1, cols=len(row)).rows[0].cells
    for cell, value in zip(cells, row, strict=True):
        cell.text = value
    out = io.BytesIO()
    document.save(out)
    return out.getvalue()


def test_text_and_markdown() -> None:
    assert extract_text("notes.txt", "﻿ Longer lysis fixed it. \n".encode()) == (
        "Longer lysis fixed it."
    )
    assert extract_text("NOTES.MD", b"# Miniprep\nYield was low.") == "# Miniprep\nYield was low."


def test_pdf() -> None:
    assert extract_text("record.pdf", make_pdf("Doubled the wash volume.")) == (
        "Doubled the wash volume."
    )


def test_a_scanned_pdf_has_no_text() -> None:
    writer, out = PdfWriter(), io.BytesIO()
    writer.add_blank_page(612, 792)
    writer.write(out)
    assert extract_text("scan.pdf", out.getvalue()) == ""


def test_docx_with_a_table() -> None:
    data = make_docx("Longer lysis fixed it.", ["Lysis", "5 min"])
    assert extract_text("record.docx", data) == "Longer lysis fixed it.\nLysis | 5 min"


def test_other_types_are_refused() -> None:
    for name in ["photo.png", "record.doc", "no-extension"]:
        with pytest.raises(UnsupportedFileType):
            extract_text(name, b"anything")


def test_a_damaged_file_cannot_be_read() -> None:
    for name, data in [("a.pdf", b"not a pdf"), ("a.docx", b"not a zip"), ("a.txt", b"\xff\xfe")]:
        with pytest.raises(ValueError, match="could not be read"):
            extract_text(name, data)
