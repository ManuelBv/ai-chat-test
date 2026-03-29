"""Tests for LLM service functions."""

from __future__ import annotations

from takehome.services.llm import count_sources_cited


def test_count_sources_single_section():
    assert count_sources_cited("See section 4 for details.") == 1


def test_count_sources_multiple_types():
    text = "As stated in section 3, clause 7 on page 12, paragraph 2 covers this."
    assert count_sources_cited(text) == 4


def test_count_sources_none():
    assert count_sources_cited("This is a general statement with no references.") == 0


def test_count_sources_case_insensitive():
    assert count_sources_cited("Section 1 and CLAUSE 2 and Page 3") == 3


def test_count_sources_repeated():
    text = "Section 1 says X. Section 1 also says Y."
    assert count_sources_cited(text) == 2
