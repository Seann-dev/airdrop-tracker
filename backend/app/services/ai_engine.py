import json
import httpx
from app.config import settings
from app.services.adapters.base import ExtractedCampaign, ExtractedTask

async def enhance_extraction_with_ai(campaign: ExtractedCampaign, raw_html: str) -> ExtractedCampaign:
    """
    Optional AI refinement step. If AI_API_KEY is configured, sends cleaned HTML/text
    to LLM for structured extraction. Falls back gracefully if AI fails or is unconfigured.
    """
    if not settings.AI_API_KEY:
        return campaign

    try:
        prompt = f"""
        You are a Web3 Airdrop Data Extractor.
        Analyze this campaign webpage content and extract precise information.

        Current Extracted Name: {campaign.name}
        URL: {campaign.campaign_url}

        Return ONLY a raw valid JSON object matching this structure:
        {{
          "name": "Project Name",
          "description": "Short overview",
          "blockchain": "EVM / Solana / Cosmos / etc.",
          "category": "DeFi / L2 / Testnet / NFT / Social",
          "reward_info": "Potential token / NFT / Points details",
          "eligibility_reqs": "Requirements (e.g. min 0.1 ETH, mainnet tx)",
          "deadline_iso": "YYYY-MM-DDTHH:MM:SSZ or null",
          "deadline_status": "Verified / Inferred / Unknown",
          "tasks": [
            {{
              "title": "Task title",
              "description": "Short explanation",
              "category": "Social / On-chain / Swap / Bridge / Daily check-in / Quiz / Other",
              "recurrence": "None / Daily / Weekly / Monthly"
            }}
          ]
        }}
        """

        headers = {
            "Authorization": f"Bearer {settings.AI_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": settings.AI_MODEL,
            "messages": [
                {"role": "system", "content": "You extract structured Airdrop & Quest data into valid JSON."},
                {"role": "user", "content": f"{prompt}\n\nWebpage Content Snippet:\n{raw_html[:4000]}"}
            ],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{settings.AI_BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                result_data = resp.json()
                content_str = result_data["choices"][0]["message"]["content"]
                parsed = json.loads(content_str)

                if parsed.get("name"):
                    campaign.name = parsed["name"]
                if parsed.get("description"):
                    campaign.description = parsed["description"]
                if parsed.get("blockchain"):
                    campaign.blockchain = parsed["blockchain"]
                if parsed.get("category"):
                    campaign.category = parsed["category"]
                if parsed.get("reward_info"):
                    campaign.reward_info = parsed["reward_info"]
                if parsed.get("eligibility_reqs"):
                    campaign.eligibility_reqs = parsed["eligibility_reqs"]
                if parsed.get("deadline_status"):
                    campaign.deadline_status = parsed["deadline_status"]

                if parsed.get("tasks") and isinstance(parsed["tasks"], list):
                    ai_tasks = []
                    for t in parsed["tasks"]:
                        ai_tasks.append(ExtractedTask(
                            title=t.get("title", "Task"),
                            description=t.get("description"),
                            category=t.get("category", "Other"),
                            recurrence=t.get("recurrence", "None"),
                            source_url=campaign.campaign_url,
                            confidence_score=0.9,
                            verification_status="Verified"
                        ))
                    if ai_tasks:
                        campaign.tasks = ai_tasks
                        
                campaign.source_attribution += " + AI Refined"
    except Exception as e:
        # Fallback cleanly on error
        pass

    return campaign
