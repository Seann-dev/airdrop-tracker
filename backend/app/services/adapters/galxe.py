import re
import json
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from app.services.adapters.base import BaseAdapter, ExtractedCampaign, ExtractedTask, ActionabilityStatus, ExtractionMethod

class GalxeAdapter(BaseAdapter):
    platform_name: str = "Galxe"

    def can_handle(self, url: str) -> bool:
        netloc = urlparse(url).netloc.lower()
        return "galxe.com" in netloc or "galaxy.eco" in netloc

    async def extract(self, url: str, html_content: str) -> ExtractedCampaign:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # 1. Project name
        title = soup.find("title")
        raw_title = title.text.strip() if title else "Galxe Quest"
        project_name = re.sub(r"\s*\|\s*Galxe.*$", "", raw_title)
        if not project_name:
            project_name = "Galxe Campaign"

        # 2. Description
        desc_meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        description = desc_meta["content"].strip() if desc_meta and desc_meta.get("content") else None

        # 3. Tasks extraction from HTML or JSON-LD
        tasks = []
        
        # Look for script tag with Next.js or Nuxt data if present
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data and next_data.string:
            try:
                data = json.loads(next_data.string)
                # Parse Next.js pageProps for campaign info
                props = data.get("props", {}).get("pageProps", {})
                campaign = props.get("campaign", {})
                if campaign:
                    if campaign.get("name"):
                        project_name = campaign.get("name")
                    if campaign.get("description"):
                        description = campaign.get("description")
                    for cred in campaign.get("credentialGroups", []):
                        for c in cred.get("credentials", []):
                            tasks.append(ExtractedTask(
                                title=c.get("name") or "Complete Credential Requirement",
                                description=c.get("description"),
                                category="Quest",
                                source_url=url,
                                confidence_score=0.95,
                                verification_status="Verified",
                                actionability=ActionabilityStatus.ACTIONABLE,
                                evidence_snippet=c.get("name"),
                                extraction_method=ExtractionMethod.JSON_LD
                            ))
            except Exception:
                pass

        # Fallback task parsing from HTML list / buttons
        if not tasks:
            task_elements = soup.select(".task-item, [class*='TaskItem'], [class*='credential'], li")
            for el in task_elements[:15]:
                txt = el.get_text(strip=True)
                if len(txt) > 5 and any(w in txt.lower() for w in ["follow", "join", "visit", "verify", "discord", "twitter", "retweet", "telegram", "claim", "hold"]):
                    tasks.append(ExtractedTask(
                        title=txt[:80],
                        category="Social" if any(w in txt.lower() for w in ["follow", "twitter", "retweet", "discord", "telegram"]) else "Quest",
                        source_url=url,
                        confidence_score=0.8,
                        verification_status="Partially verified",
                        actionability=ActionabilityStatus.ACTIONABLE,
                        evidence_snippet=txt[:120],
                        extraction_method=ExtractionMethod.HTML_PATTERN
                    ))

        if not tasks:
            tasks.append(ExtractedTask(
                title="Complete Galxe Campaign Tasks",
                description="Follow project requirements and claim credentials on Galxe.",
                category="Quest",
                source_url=url,
                confidence_score=0.7,
                verification_status="Inferred"
            ))

        return ExtractedCampaign(
            name=project_name,
            description=description,
            campaign_url=url,
            platform="Galxe",
            blockchain="Multi-chain",
            category="Airdrop Quest",
            deadline=None,
            deadline_status="Unknown",
            reward_info="Loyalty Points / OAT / Token Allocation",
            confidence_score=0.9,
            status_code="Completed",
            tasks=tasks,
            source_attribution="Galxe Adapter (HTML/Structured Data)"
        )
