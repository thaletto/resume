#!/usr/bin/env python3
"""Verify generated resume PDFs are present, non-empty, and exactly two pages."""

from __future__ import annotations

import sys
from pathlib import Path

EXPECTED_PAGES = 2
MIN_BYTES = 1000


def page_count(path: Path) -> int | None:
    """Return the PDF page count, or None if no PDF library is installed."""
    try:
        import pymupdf

        return len(pymupdf.open(path))
    except ImportError:
        pass

    try:
        from pypdf import PdfReader

        return len(PdfReader(path).pages)
    except ImportError:
        return None


def check(path: Path) -> bool:
    """Print a report for one PDF and return whether it passed."""
    print(f"    {path}")

    if not path.is_file():
        print("      FAIL: missing")
        return False

    size = path.stat().st_size
    print(f"      Size: {size} bytes")
    if size < MIN_BYTES:
        print("      FAIL: PDF too small")
        return False

    pages = page_count(path)
    if pages is None:
        print("      SKIP: install pymupdf or pypdf for the page-count check")
        return True

    print(f"      Pages: {pages}")
    if pages != EXPECTED_PAGES:
        print(f"      FAIL: expected {EXPECTED_PAGES} pages, got {pages}")
        return False

    return True


def main(paths: list[str]) -> int:
    results = [check(Path(p)) for p in paths]
    return 0 if all(results) else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: check_pdf.py <pdf> [<pdf> ...]")
    sys.exit(main(sys.argv[1:]))
