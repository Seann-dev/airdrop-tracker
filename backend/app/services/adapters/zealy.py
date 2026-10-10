import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from app.services.adapters.base import BaseAdapter, ExtractedCampaign, ExtractedTask, ActionabilityStatus, ExtractionMethod

class ZealyAdapter(BaseAdapter):
    platform_name: str = "Zealy"

    def can_handle(self, url: str) -> bool:
        netloc = urlparse(url).netloc.lower()
        return "zealy.io" in netloc

    async def extract(self, url: str, html_content: str) -> ExtractedCampaign:
        soup = BeautifulSoup(html_content, "html.parser")
        
        title = soup.find("title")
        raw_title = title.text.strip() if title else "Zealy Community"
        project_name = re.sub(r"\s*\|\s*Zealy.*$", "", raw_title)
        
        desc_meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        description = desc_meta["content"].strip() if desc_meta and desc_meta.get("content") else None
        
        tasks = []
        elements = soup.select("[class*='quest'], [class*='Quest'], li")
        for el in elements[:15]:
            txt = el.get_text(strip=True)
            if len(txt) > 5 and any(w in txt.lower() for w in ["daily", "quiz", "follow", "invite", "connect", "level", "role", "sprint"]):
                tasks.append(ExtractedTask(
                    title=txt[:80],
                    category="Daily check-in" if "daily" in txt.lower() else "Community",
                    recurrence="Daily" if "daily" in txt.lower() else "None",
                    source_url=url,
                    confidence_score=0.85,
                    verification_status="Partially verified",
                    actionability=ActionabilityStatus.ACTIONABLE,
                    evidence_snippet=txt[:120],
                    extraction_method=ExtractionMethod.HTML_PATTERN
                ))
                
        if not tasks:
            tasks.append(ExtractedTask(
                title="Complete Zealy Community Sprint Quests",
                description="Earn XP and unlock roles on Zealy leaderboard.",
                category="Community",
                source_url=url,
                confidence_score=0.75,
                verification_status="Inferred"
            ))

        return ExtractedCampaign(
            name=project_name,
            description=description,
            campaign_url=url,
            platform="Zealy",
            blockchain="Multi-chain",
            category="Community Sprint",
            deadline=None,
            deadline_status="Unknown",
            reward_info="Community XP & Role Rewards",
            confidence_score=0.85,
            status_code="Completed",
            tasks=tasks,
            source_attribution="Zealy Adapter"
        )
