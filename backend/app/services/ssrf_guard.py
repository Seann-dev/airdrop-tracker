import ipaddress
import socket
import asyncio
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
    Safely fetches a URL respecting SSRF protections using curl for system proxy stability.
    """
    validate_url_security(url)
    
    proc = await asyncio.create_subprocess_exec(
        "curl", "-s", "-i", "-L", "--max-time", "15", "--max-redirs", "5", url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout_bytes, stderr_bytes = await proc.communicate()
    
    if proc.returncode != 0:
        raise Exception(f"Failed to fetch URL: curl exit code {proc.returncode}")
        
    raw_response = stdout_bytes.decode('utf-8', errors='ignore')
    
    parts = raw_response.split('\r\n\r\n')
    body = parts[-1]
    header_block = parts[-2] if len(parts) > 1 else ""
    
    status_code = 200
    headers = {}
    lines = header_block.split('\r\n')
    if lines and lines[0].startswith('HTTP/'):
        try:
            status_code = int(lines[0].split(' ')[1])
        except Exception:
            pass
            
    if len(body.encode("utf-8")) > settings.SSRF_MAX_CONTENT_LENGTH:
        raise ValueError(f"Response body exceeded limit of {settings.SSRF_MAX_CONTENT_LENGTH} bytes.")
        
    return status_code, body, headers
