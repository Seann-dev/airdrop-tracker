import re
import json
from bs4 import BeautifulSoup, Tag
from urllib.parse import urlparse, urljoin
from datetime import datetime
from app.services.adapters.base import BaseAdapter, ExtractedCampaign, ExtractedTask, ActionabilityStatus, ExtractionMethod

class GenericAdapter(BaseAdapter):
    platform_name: str = "Generic Web3 Website"

    def can_handle(self, url: str) -> bool:
        return True # Catch-all

    async def extract(self, url: str, html_content: str) -> ExtractedCampaign:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # 1. OpenGraph / Meta Data
        title_tag = soup.find("title")
        og_title = soup.find("meta", attrs={"property": "og:title"})
        raw_title = og_title["content"] if og_title and og_title.get("content") else (title_tag.text.strip() if title_tag else urlparse(url).netloc)
        
        og_desc = soup.find("meta", attrs={"property": "og:description"}) or soup.find("meta", attrs={"name": "description"})
        description = og_desc["content"] if og_desc and og_desc.get("content") else None
        
        # 2. Extract Reward info from metadata or text
        reward_info = "Unknown"
        reward_pat = r'(\d+[\d,.]*\s*(?:million|billion|k|m)?(?:\s+[A-Z0-9$]+)?\s*(?:tokens?|points|XP|USDT|USDC|ETH))\b'
        candidates = [m.group(1).strip() for m in re.finditer(reward_pat, html_content, re.IGNORECASE)]
        valid_candidates = [c for c in candidates if len(c) > 2 and not c.startswith("0") and not c.lower().startswith("0.")]
        if valid_candidates:
            pri = [c for c in valid_candidates if any(w in c.lower() for w in ["million", "billion", "token", "$"])]
            reward_info = pri[0] if pri else valid_candidates[0]

        # 3. Extract Campaign Deadline (distinguishing recurring monthly schedule from fixed end dates)
        deadline = None
        deadline_status = "Unknown"
        deadline_patterns = [
            r'(?:campaign deadline|ends on|ends at|campaign end date)\s*[:\-]?\s*([A-Za-z]+ \d{1,2}(?:th|st|nd|rd)?,? \d{4})',
            r'(?:campaign deadline|ends on|ends at|campaign end date)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})'
        ]
        for pat in deadline_patterns:
            d_match = re.search(pat, html_content, re.IGNORECASE)
            if d_match:
                d_str = d_match.group(1).strip()
                clean_d = re.sub(r'(\d+)(?:st|nd|rd|th)', r'\1', d_str)
                for fmt in ("%B %d, %Y", "%B %d %Y", "%b %d, %Y", "%b %d %Y", "%Y-%m-%d"):
                    try:
                        parsed_dt = datetime.strptime(clean_d, fmt)
                        deadline = parsed_dt
                        deadline_status = "Verified"
                        break
                    except ValueError:
                        continue
                if deadline:
                    break

        # 4. JSON-LD Structured Data Extraction (Schema.org / HowTo / ItemList)
        tasks: list[ExtractedTask] = []
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                raw_text = script.get_text() or ""
                if not raw_text.strip():
                    continue
                data = json.loads(raw_text)
                if isinstance(data, dict):
                    items = data.get("@graph") if "@graph" in data else [data]
                elif isinstance(data, list):
                    items = data
                else:
                    items = [data]

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    
                    how_tos = []
                    if item.get("@type") == "HowTo":
                        how_tos.append(item)
                    for sub in item.get("subjectOf", []) if isinstance(item.get("subjectOf"), list) else [item.get("subjectOf")]:
                        if isinstance(sub, dict) and sub.get("@type") == "HowTo":
                            how_tos.append(sub)

                    for ht in how_tos:
                        steps = ht.get("step", [])
                        for s in steps:
                            step_name = s.get("name") or s.get("text")
                            if step_name and isinstance(step_name, str):
                                s_clean = step_name.strip()
                                if len(s_clean) > 8:
                                    actionability, conf, verif = self._classify_actionability(s_clean)
                                    cat = self._categorize_task(s_clean)
                                    rec = "Monthly" if "end of each month" in s_clean.lower() or "monthly" in s_clean.lower() else "None"
                                    tasks.append(ExtractedTask(
                                        title=s_clean,
                                        description=s.get("description"),
                                        category=cat,
                                        source_url=url,
                                        recurrence=rec,
                                        confidence_score=conf,
                                        verification_status=verif,
                                        actionability=actionability,
                                        evidence_snippet=s_clean[:150],
                                        extraction_method=ExtractionMethod.JSON_LD
                                    ))
            except Exception:
                continue

        # If JSON-LD provided tasks, deduplicate and return
        if tasks:
            unique_tasks = self._deduplicate_tasks(tasks)
            return ExtractedCampaign(
                name=raw_title[:100],
                description=description[:500] if description else None,
                campaign_url=url,
                platform=urlparse(url).netloc,
                blockchain="Unknown",
                category="Testnet / Airdrop",
                deadline=deadline,
                deadline_status=deadline_status,
                reward_info=reward_info,
                confidence_score=0.85,
                status_code="Completed",
                tasks=unique_tasks[:15],
                source_attribution="Structured JSON-LD Parser"
            )

        # 5. DOM Decontamination: Strip navigation, sidebars, headers, footers
        for tag in soup(["nav", "header", "footer", "aside", "script", "style", "noscript", "svg", "form", "iframe"]):
            tag.decompose()

        for tag in soup.find_all(attrs={"class": re.compile(r'(nav|menu|sidebar|footer|header|widget|trending|recent|breadcrumb|cookie)', re.I)}):
            tag.decompose()

        for tag in soup.find_all(attrs={"id": re.compile(r'(nav|menu|sidebar|footer|header|widget)', re.I)}):
            tag.decompose()

        # 6. Look for guide/task container
        guide_container = soup.find(class_=re.compile(r'(airdrop-guide|guide-steps|step-list|instructions|campaign-tasks|quest-steps|steps)', re.I))
        search_root = guide_container or soup.find(["article", "main"]) or soup.body or soup

        # 7. Extract potential task elements
        candidates = search_root.find_all(["li", "p", "h3", "h4"])

        for el in candidates:
            txt = el.get_text(separator=" ", strip=True)
            if not (12 <= len(txt) <= 220):
                continue

            cleaned_txt = re.sub(r'^(?:step\s*\d+[\s:\-.]*|\d+[\s:\-.]*|\[\d+\][\s:\-.]*)', '', txt, flags=re.IGNORECASE).strip()
            if len(cleaned_txt) < 8:
                continue

            t_lower = cleaned_txt.lower()
            if any(t_lower.startswith(p) for p in ["deadline", "campaign deadline", "total pool", "reward pool", "airdrop pool", "copyright"]):
                continue

            actionability, conf, verif = self._classify_actionability(cleaned_txt)

            # Find direct link inside the element if present
            link_tag = el.find("a", href=True)
            task_url = url
            if link_tag and isinstance(link_tag, Tag):
                href = link_tag.get("href", "")
                if href.startswith("http"):
                    task_url = href
                elif href.startswith("/"):
                    task_url = urljoin(url, href)

            # Check task-specific deadline
            task_deadline = None
            task_d_match = re.search(r'(?:by|before|until)\s+([A-Za-z]+ \d{1,2}(?:th|st|nd|rd)?,? \d{4})', cleaned_txt, re.IGNORECASE)
            if task_d_match:
                raw_td = re.sub(r'(\d+)(?:st|nd|rd|th)', r'\1', task_d_match.group(1))
                for fmt in ("%B %d, %Y", "%B %d %Y", "%b %d, %Y", "%b %d %Y"):
                    try:
                        task_deadline = datetime.strptime(raw_td, fmt)
                        break
                    except ValueError:
                        pass

            category = self._categorize_task(cleaned_txt)
            rec = "Monthly" if "end of each month" in t_lower or "monthly" in t_lower else "None"
            tasks.append(ExtractedTask(
                title=cleaned_txt,
                category=category,
                source_url=task_url,
                deadline=task_deadline,
                recurrence=rec,
                confidence_score=conf,
                verification_status=verif,
                actionability=actionability,
                evidence_snippet=cleaned_txt[:150],
                extraction_method=ExtractionMethod.DOM_CONTENT
            ))

        unique_tasks = self._deduplicate_tasks(tasks)

        if not unique_tasks:
            unique_tasks = [ExtractedTask(
                title="Review Campaign Instructions",
                description=f"Visit {url} and follow instructions to participate.",
                category="Other",
                source_url=url,
                confidence_score=0.5,
                verification_status="Inferred",
                actionability=ActionabilityStatus.REVIEW_REQUIRED,
                evidence_snippet=f"Visit {url}",
                extraction_method=ExtractionMethod.DOM_CONTENT
            )]

        return ExtractedCampaign(
            name=raw_title[:100],
            description=description[:500] if description else None,
            campaign_url=url,
            platform=urlparse(url).netloc,
            blockchain="Unknown",
            category="Testnet / Airdrop",
            deadline=deadline,
            deadline_status=deadline_status,
            reward_info=reward_info,
            confidence_score=0.7,
            status_code="Completed",
            tasks=unique_tasks[:15],
            source_attribution="Cleaned DOM Content Parser"
        )

    def _classify_actionability(self, text: str) -> tuple[ActionabilityStatus, float, str]:
        t = text.lower()
        
        # 1. Informational: Team duties, program evaluation, distribution schedules
        info_keywords = [
            "gitcoin reviews", "gitcoin –", "gitcoin -", "discord admins", 
            "community moderators", "contributions are verified", "evaluation", 
            "rewards are distributed at the end of each month", "program is funded", 
            "allocations were based", "snapshot was taken", "full eligibility list",
            "access structured activities"
        ]
        if any(kw in t for kw in info_keywords):
            return ActionabilityStatus.INFORMATIONAL, 0.9, "Verified"

        # 2. Vague / Review Required: "receive guidance", "learn about", "understand"
        vague_keywords = ["receive guidance", "learn about", "overview of", "understand how"]
        if any(kw in t for kw in vague_keywords):
            return ActionabilityStatus.REVIEW_REQUIRED, 0.6, "Inferred"

        # 3. Actionable User Actions: concrete user verbs
        action_verbs = [
            "submit activities", "participate in", "engage in", "join specialized", 
            "host and participate", "contribute through", "connect wallet", "swap", 
            "bridge", "stake", "mint", "claim tokens", "follow", "retweet", 
            "verify", "sign in", "check", "deposit", "vote", "delegate"
        ]
        if any(kw in t for kw in action_verbs):
            return ActionabilityStatus.ACTIONABLE, 0.9, "Verified"

        # Default fallback
        return ActionabilityStatus.REVIEW_REQUIRED, 0.7, "Inferred"

    def _categorize_task(self, text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["daily", "check-in", "streak", "every day", "24h"]):
            return "Daily check-in"
        if any(w in t for w in ["testnet", "sepolia", "goerli", "holesky", "faucet"]):
            return "Testnet"
        if any(w in t for w in ["swap", "bridge", "deposit", "stake", "mint", "liquidity", "transaction", "gas", "vote", "delegate"]):
            return "On-chain"
        if any(w in t for w in ["twitter", "x.com", "discord", "telegram", "follow", "retweet", "share", "community", "ama"]):
            return "Social"
        return "Quest"

    def _deduplicate_tasks(self, tasks: list[ExtractedTask]) -> list[ExtractedTask]:
        seen = set()
        deduped = []
        for t in tasks:
            normalized = re.sub(r'\s+', ' ', t.title.strip().lower())
            if normalized not in seen:
                seen.add(normalized)
                deduped.append(t)
        return deduped
