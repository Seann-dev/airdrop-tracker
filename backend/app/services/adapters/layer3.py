import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from app.services.adapters.base import BaseAdapter, ExtractedCampaign, ExtractedTask, ActionabilityStatus, ExtractionMethod

class Layer3Adapter(BaseAdapter):
    platform_name: str = "Layer3"

    def can_handle(self, url: str) -> bool:
        netloc = urlparse(url).netloc.lower()
        return "layer3.xyz" in netloc

    async def extract(self, url: str, html_content: str) -> ExtractedCampaign:
        soup = BeautifulSoup(html_content, "html.parser")
        
        title = soup.find("title")
        raw_title = title.text.strip() if title else "Layer3 Quest"
        project_name = re.sub(r"\s*\|\s*Layer3.*$", "", raw_title)
        
        desc_meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        description = desc_meta["content"].strip() if desc_meta and desc_meta.get("content") else None
        
        tasks = []
        elements = soup.select("[class*='step'], [class*='Step'], [class*='task'], [class*='Task'], li")
        for el in elements[:12]:
            txt = el.get_text(strip=True)
            if len(txt) > 5 and any(w in txt.lower() for w in ["swap", "bridge", "deposit", "mint", "quiz", "follow", "verify", "open"]):
                tasks.append(ExtractedTask(
                    title=txt[:80],
                    category="On-chain" if any(w in txt.lower() for w in ["swap", "bridge", "deposit", "mint"]) else "Quest",
                    source_url=url,
                    confidence_score=0.85,
                    verification_status="Partially verified",
                    actionability=ActionabilityStatus.ACTIONABLE,
                    evidence_snippet=txt[:120],
                    extraction_method=ExtractionMethod.HTML_PATTERN
                ))
                
        if not tasks:
            tasks.append(ExtractedTask(
                title="Complete Layer3 Interactive Quest Steps",
                description="Follow interactive on-chain milestones on Layer3.",
                category="Quest",
                source_url=url,
                confidence_score=0.75,
                verification_status="Inferred"
            ))

        return ExtractedCampaign(
            name=project_name,
            description=description,
            campaign_url=url,
            platform="Layer3",
            blockchain="EVM",
            category="Interactive Quests",
            deadline=None,
            deadline_status="Unknown",
            reward_info="CUBEs / XP / Gems",
            confidence_score=0.88,
            status_code="Completed",
            tasks=tasks,
            source_attribution="Layer3 Adapter (HTML Parsing)"
        )
