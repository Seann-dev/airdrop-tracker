import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from app.services.adapters.base import BaseAdapter, ExtractedCampaign, ExtractedTask, ActionabilityStatus, ExtractionMethod

class TaskOnAdapter(BaseAdapter):
    platform_name: str = "TaskOn"

    def can_handle(self, url: str) -> bool:
        netloc = urlparse(url).netloc.lower()
        return "taskon.xyz" in netloc

    async def extract(self, url: str, html_content: str) -> ExtractedCampaign:
        soup = BeautifulSoup(html_content, "html.parser")
        
        title = soup.find("title")
        raw_title = title.text.strip() if title else "TaskOn Campaign"
        project_name = re.sub(r"\s*\|\s*TaskOn.*$", "", raw_title)
        
        desc_meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        description = desc_meta["content"].strip() if desc_meta and desc_meta.get("content") else None
        
        tasks = []
        elements = soup.select("[class*='task'], [class*='Task'], [class*='mission'], li")
        for el in elements[:10]:
            txt = el.get_text(strip=True)
            if len(txt) > 5 and any(w in txt.lower() for w in ["join", "follow", "verify", "visit", "retweet", "like"]):
                tasks.append(ExtractedTask(
                    title=txt[:80],
                    category="Social",
                    source_url=url,
                    confidence_score=0.85,
                    verification_status="Partially verified",
                    actionability=ActionabilityStatus.ACTIONABLE,
                    evidence_snippet=txt[:120],
                    extraction_method=ExtractionMethod.HTML_PATTERN
                ))
                
        if not tasks:
            tasks.append(ExtractedTask(
                title="Complete TaskOn Campaign",
                description="Follow TaskOn steps to win tokens/NFT.",
                category="Quest",
                source_url=url,
                confidence_score=0.7,
                verification_status="Inferred"
            ))

        return ExtractedCampaign(
            name=project_name,
            description=description,
            campaign_url=url,
            platform="TaskOn",
            blockchain="Multi-chain",
            category="Giveaway / Quest",
            deadline=None,
            deadline_status="Unknown",
            reward_info="Tokens / CAP / NFT / USDT",
            confidence_score=0.85,
            status_code="Completed",
            tasks=tasks,
            source_attribution="TaskOn Adapter"
        )
