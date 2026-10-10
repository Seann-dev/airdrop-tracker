import pytest
from app.services.ssrf_guard import is_ip_allowed, validate_url_security

def test_blocked_private_ips():
    # Loopback
    assert is_ip_allowed("127.0.0.1") is False
    assert is_ip_allowed("127.0.1.1") is False
    assert is_ip_allowed("::1") is False
    
    # Private RFC 1918
    assert is_ip_allowed("10.0.0.5") is False
    assert is_ip_allowed("172.16.1.1") is False
    assert is_ip_allowed("192.168.1.100") is False
    
    # Cloud metadata (AWS / GCP / Azure)
    assert is_ip_allowed("169.254.169.254") is False
    
    # Public IPs allowed
    assert is_ip_allowed("8.8.8.8") is True
    assert is_ip_allowed("1.1.1.1") is True

def test_validate_url_schemes():
    with pytest.raises(ValueError, match="Disallowed URL scheme"):
        validate_url_security("ftp://example.com/file")
        
    with pytest.raises(ValueError, match="Disallowed URL scheme"):
        validate_url_security("file:///etc/passwd")

def test_localhost_and_private_hostnames():
    with pytest.raises(ValueError, match="Access to localhost is forbidden"):
        validate_url_security("http://localhost:8000")
        
    with pytest.raises(ValueError, match="Access to localhost is forbidden"):
        validate_url_security("http://127.0.0.1/admin")
