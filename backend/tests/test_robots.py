from urllib.robotparser import RobotFileParser

from app.services.robots import _mark_fetched, _should_throttle, is_allowed


def test_is_allowed_respects_disallow():
    rp = RobotFileParser()
    rp.parse(
        [
            "User-agent: *",
            "Disallow: /private/",
        ]
    )
    assert is_allowed(rp, "/public/") is True
    assert is_allowed(rp, "/private/secret") is False


def test_rate_limit_enforced():
    _mark_fetched("example.com")
    assert _should_throttle("example.com") is True  # second call too soon
