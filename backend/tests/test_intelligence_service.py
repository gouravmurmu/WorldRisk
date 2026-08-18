from app.services.intelligence_service import _detect_scope
from app.taxonomy import EventCategory


def test_detects_region():
    scope = _detect_scope("What are the biggest active risks in Asia?")
    assert scope["region"] == "Asia"
    assert scope["country_code"] is None


def test_detects_country_over_generic_text():
    scope = _detect_scope("Summarize escalating events in India.")
    assert scope["country_code"] == "IN"


def test_detects_multiple_categories_from_energy_keyword():
    scope = _detect_scope("What are the biggest risks to global energy supply?")
    assert EventCategory.ECONOMIC in scope["categories"]
    assert EventCategory.SUPPLY_CHAIN in scope["categories"]


def test_generic_question_has_no_scope():
    scope = _detect_scope("What is going on in general?")
    assert scope == {"region": None, "country_code": None, "categories": []}


def test_different_questions_detect_different_scopes():
    # Regression guard for the bug where every question hit the same
    # global-only fallback regardless of what was actually asked.
    a = _detect_scope("What are the biggest active risks in Asia?")
    b = _detect_scope("Tell me about cyber attacks happening right now")
    assert a != b
