from urllib.parse import urlparse
from app.services.ssrf_guard import safe_fetch_url, validate_url_security
from app.services.adapters.galxe import GalxeAdapter
from app.services.adapters.layer3 import Layer3Adapter
from app.services.adapters.zealy import ZealyAdapter
from app.services.adapters.taskon import TaskOnAdapter
from app.services.adapters.generic import GenericAdapter
from app.services.adapters.base import ExtractedCampaign
from app.services.ai_engine import enhance_extraction_with_ai
from app.schemas.scanner import ScanPreviewResponse, ExtractedTaskPreview

ADAPTERS = [
    GalxeAdapter(),
    Layer3Adapter(),
    ZealyAdapter(),
    TaskOnAdapter(),
    GenericAdapter(), # Fallback
]

def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    # Strip tracking params
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    return f"{scheme}://{netloc}{path}"

async def scan_campaign_url(url: str) -> ScanPreviewResponse:
    # 1. Normalize & Validate SSRF
    norm_url = normalize_url(url)
    validate_url_security(norm_url)

    # 2. Safe Fetch
    status_code, html_content, headers = await safe_fetch_url(norm_url)

    if status_code >= 400:
        return ScanPreviewResponse(
            url=url,
            normalized_url=norm_url,
            platform=urlparse(norm_url).netloc,
            project_name=f"Campaign ({urlparse(norm_url).netloc})",
            deadline_status="Unknown",
            status_code="Failed" if status_code >= 500 else "Access denied",
            confidence_score=0.0,
            tasks=[],
            source_attribution=f"HTTP {status_code} Error"
        )

    # 3. Select Adapter
    selected_adapter = None
    for adapter in ADAPTERS:
        if adapter.can_handle(norm_url):
            selected_adapter = adapter
            break

    if not selected_adapter:
        selected_adapter = GenericAdapter()

    # 4. Adapter Extraction
    extracted: ExtractedCampaign = await selected_adapter.extract(norm_url, html_content)

    # 5. Optional AI Enhancement
    enhanced: ExtractedCampaign = await enhance_extraction_with_ai(extracted, html_content)

    # 6. Format Response
    tasks_preview = [
        ExtractedTaskPreview(
            title=t.title,
            description=t.description,
            category=t.category,
            source_url=t.source_url,
            deadline=t.deadline,
            recurrence=t.recurrence,
            reward_info=t.reward_info,
            confidence_score=t.confidence_score,
            verification_status=t.verification_status,
            actionability=t.actionability.value if hasattr(t.actionability, "value") else str(t.actionability),
            evidence_snippet=t.evidence_snippet,
            extraction_method=t.extraction_method.value if hasattr(t.extraction_method, "value") and t.extraction_method else str(t.extraction_method) if t.extraction_method else None
        ) for t in enhanced.tasks
    ]

    return ScanPreviewResponse(
        url=url,
        normalized_url=norm_url,
        platform=enhanced.platform,
        project_name=enhanced.name,
        description=enhanced.description,
        official_website=enhanced.official_website,
        blockchain=enhanced.blockchain,
        category=enhanced.category,
        deadline=enhanced.deadline,
        deadline_status=enhanced.deadline_status,
        reward_info=enhanced.reward_info,
        eligibility_reqs=enhanced.eligibility_reqs,
        status_code=enhanced.status_code,
        confidence_score=enhanced.confidence_score,
        tasks=tasks_preview,
        source_attribution=enhanced.source_attribution
    )
