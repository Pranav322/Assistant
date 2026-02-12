from __future__ import annotations

from typing import Optional
import asyncio
import ipaddress
import socket
from urllib.parse import urlparse, urljoin
import aiohttp
from app.core.config import settings

BLOCKED_HOSTNAMES = {
    "metadata.google.internal",
    "metadata.google.internal.",
}


BLOCKED_IP_RANGES = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _is_blocked_ip(ip: str) -> bool:
    ip_addr = ipaddress.ip_address(ip)
    return any(ip_addr in network for network in BLOCKED_IP_RANGES)


async def _resolve_host(hostname: str) -> list[str]:
    def _lookup() -> list[str]:
        infos = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
        return list({info[4][0] for info in infos})

    return await asyncio.to_thread(_lookup)


async def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Invalid URL scheme")
    if not parsed.hostname:
        raise ValueError("Invalid URL")

    hostname = parsed.hostname.lower()
    if hostname in BLOCKED_HOSTNAMES:
        raise ValueError("Blocked hostname")

    if _is_ip_address(hostname) and _is_blocked_ip(hostname):
        raise ValueError("Blocked IP address")

    for ip in await _resolve_host(hostname):
        if _is_blocked_ip(ip):
            raise ValueError("Blocked IP address")

    return url


def _is_ip_address(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


async def fetch_url_content(url: str) -> tuple[bytes, Optional[str], str]:
    validated_url = await validate_url(url)
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    timeout = aiohttp.ClientTimeout(total=settings.URL_FETCH_TIMEOUT_SECONDS)

    async with aiohttp.ClientSession(timeout=timeout) as session:
        current_url = validated_url
        for _ in range(settings.URL_FETCH_MAX_REDIRECTS + 1):
            async with session.get(current_url, allow_redirects=False) as response:
                if response.status in (301, 302, 303, 307, 308):
                    location = response.headers.get("Location")
                    if not location:
                        raise ValueError("Redirect without location")
                    current_url = urljoin(current_url, location)
                    await validate_url(current_url)
                    continue

                if response.status != 200:
                    raise ValueError(f"HTTP {response.status}")

                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > max_bytes:
                    raise ValueError("URL content exceeds maximum size")

                content = await response.content.read(max_bytes + 1)
                if len(content) > max_bytes:
                    raise ValueError("URL content exceeds maximum size")

                content_type = response.headers.get("Content-Type")
                return content, content_type, current_url

    raise ValueError("Too many redirects")
