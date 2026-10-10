import ipaddress
import socket
from urllib.parse import urlparse
from app.config import settings

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_ip_allowed(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        for net in BLOCKED_IP_NETWORKS:
            if ip in net:
                return False
        return True
    except ValueError:
        return False

def validate_url_security(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Disallowed URL scheme: {parsed.scheme}. Only HTTP/HTTPS permitted.")
    
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")
    
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        raise ValueError("Access to localhost is forbidden (SSRF Protection).")
    
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise ValueError(f"DNS resolution failed for {hostname}: {str(e)}")
        
    for item in addr_info:
        ip = item[4][0]
        if not is_ip_allowed(ip):
            raise ValueError(f"Access to private/internal IP {ip} is forbidden (SSRF Protection).")
            
    return url

async def safe_fetch_url(url: str) -> tuple[int, str, dict]:
    """
    Safely fetches a URL respecting SSRF protections using httpx (no system deps).
    """
    import httpx
    validate_url_security(url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        resp = await client.get(url, headers={"User-Agent": "AirdropTracker/1.0"})
        body = resp.text
        headers = dict(resp.headers)

    if len(body.encode("utf-8")) > settings.SSRF_MAX_CONTENT_LENGTH:
        raise ValueError(f"Response body exceeded limit of {settings.SSRF_MAX_CONTENT_LENGTH} bytes.")

    return resp.status_code, body, headers
