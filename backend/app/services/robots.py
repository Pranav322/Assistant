import time
from typing import Dict, Optional
from urllib.robotparser import RobotFileParser

import aiohttp

_last_fetch: Dict[str, float] = {}


def is_allowed(parser: RobotFileParser, path: str) -> bool:
    return parser.can_fetch("*", path)


async def fetch_robots_with_cache(
    session: aiohttp.ClientSession, hostname: str
) -> Optional[RobotFileParser]:
    parser = RobotFileParser()
    parser.set_url(f"https://{hostname}/robots.txt")
    try:
        async with session.get(
            f"https://{hostname}/robots.txt", timeout=aiohttp.ClientTimeout(total=5)
        ) as resp:
            if resp.status != 200:
                # No robots.txt = everything allowed
                bot = RobotFileParser()
                bot.parse([])
                return bot
            body = await resp.text()
        parser.parse(body.splitlines())
        return parser
    except Exception:
        return None  # On any failure, be permissive (fail-open) — don't block ingestion


def _should_throttle(hostname: str) -> bool:
    from app.core.config import settings

    interval = getattr(settings, "URL_FETCH_MIN_INTERVAL_SECONDS", 1.0)
    now = time.monotonic()
    last = _last_fetch.get(hostname)
    return last is not None and (now - last) < interval


def _mark_fetched(hostname: str) -> None:
    _last_fetch[hostname] = time.monotonic()
