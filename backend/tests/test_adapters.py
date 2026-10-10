import pytest
from app.services.adapters.galxe import GalxeAdapter
from app.services.adapters.layer3 import Layer3Adapter
from app.services.adapters.zealy import ZealyAdapter
from app.services.adapters.taskon import TaskOnAdapter
from app.services.adapters.generic import GenericAdapter

@pytest.mark.asyncio
async def test_galxe_adapter():
    adapter = GalxeAdapter()
    url = "https://app.galxe.com/quest/monad/airdrop-phase1"
    assert adapter.can_handle(url) is True
    
    mock_html = """
    <html>
      <head><title>Monad Testnet Journey | Galxe</title></head>
      <body>
        <div class="task-item">Follow Monad on Twitter</div>
        <div class="task-item">Join Monad Discord community</div>
        <div class="task-item">Claim Early Tester OAT</div>
      </body>
    </html>
    """
    res = await adapter.extract(url, mock_html)
    assert res.platform == "Galxe"
    assert "Monad Testnet Journey" in res.name
    assert len(res.tasks) >= 3
    assert any("Twitter" in t.title for t in res.tasks)

@pytest.mark.asyncio
async def test_layer3_adapter():
    adapter = Layer3Adapter()
    url = "https://layer3.xyz/quests/berachain-v2-exploration"
    assert adapter.can_handle(url) is True
    
    mock_html = """
    <html>
      <head><title>Berachain Exploration | Layer3</title></head>
      <body>
        <div class="Step">Swap BERA on BEX</div>
        <div class="Step">Mint Honey stablecoin</div>
      </body>
    </html>
    """
    res = await adapter.extract(url, mock_html)
    assert res.platform == "Layer3"
    assert "Berachain Exploration" in res.name
    assert len(res.tasks) >= 2

@pytest.mark.asyncio
async def test_zealy_adapter():
    adapter = ZealyAdapter()
    url = "https://zealy.io/c/fuelnetwork/questboard"
    assert adapter.can_handle(url) is True
    
    mock_html = """
    <html>
      <head><title>Fuel Network Sprint | Zealy</title></head>
      <body>
        <div class="quest">Daily Check-in Quiz</div>
        <div class="quest">Follow Fuel Network announcement</div>
      </body>
    </html>
    """
    res = await adapter.extract(url, mock_html)
    assert res.platform == "Zealy"
    assert any(t.recurrence == "Daily" for t in res.tasks)

@pytest.mark.asyncio
async def test_taskon_adapter():
    adapter = TaskOnAdapter()
    url = "https://taskon.xyz/campaign/detail/12345"
    assert adapter.can_handle(url) is True
    
    mock_html = """
    <html>
      <head><title>Initia Public Testnet | TaskOn</title></head>
      <body>
        <div class="task">Join Telegram Announcement</div>
      </body>
    </html>
    """
    res = await adapter.extract(url, mock_html)
    assert res.platform == "TaskOn"
    assert len(res.tasks) >= 1

@pytest.mark.asyncio
async def test_generic_adapter_regression_nav_filtering():
    """Regression test: Nav links like 'Claim reward' in header/sidebar must not become tasks."""
    adapter = GenericAdapter()
    url = "https://example-airdrops.com/project"
    mock_html = """
    <html>
      <head>
        <title>ZetaChain Airdrop Campaign</title>
        <meta name="description" content="Official ZetaChain incentivized testnet guide." />
      </head>
      <body>
        <header>
          <nav>
            <ul>
              <li><a href="/claims">Claims</a></li>
              <li><a href="/claim-live">Claim Live Rewards</a></li>
            </ul>
          </nav>
        </header>
        <aside class="sidebar-widget">
          <div class="trending">Claim daily bonus</div>
        </aside>
        <main>
          <article class="airdrop-guide">
            <h2>How to Participate</h2>
            <ol class="guide-steps">
              <li>Visit the ZetaChain testnet faucet</li>
              <li>Swap ZETA on Athens testnet DEX</li>
              <li>Deposit liquidity into pool</li>
            </ol>
          </article>
        </main>
        <footer>
          <p>Claim copyright 2026</p>
        </footer>
      </body>
    </html>
    """
    res = await adapter.extract(url, mock_html)
    assert res.platform == "example-airdrops.com"
    assert res.deadline_status == "Unknown"
    assert res.deadline is None
    # Verify no nav or sidebar tasks leaked
    titles = [t.title for t in res.tasks]
    assert not any("Claims" == t for t in titles)
    assert not any("Claim Live Rewards" in t for t in titles)
    assert not any("Claim daily bonus" in t for t in titles)
    assert not any("Claim copyright" in t for t in titles)
    # Verify legitimate tasks were extracted
    assert any("faucet" in t.lower() for t in titles)
    assert any("swap" in t.lower() for t in titles)
    assert any("liquidity" in t.lower() for t in titles)
    assert all(t.source_url is not None for t in res.tasks)

@pytest.mark.asyncio
async def test_generic_adapter_json_ld_and_deadline():
    """Verify structured JSON-LD HowTo extraction with explicit deadline and reward."""
    adapter = GenericAdapter()
    url = "https://airdrop-hub.xyz/campaign/alpha"
    mock_html = """
    <html>
      <head>
        <title>Alpha Protocol Airdrop</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "Alpha Airdrop Steps",
          "step": [
            {"@type": "HowToStep", "name": "Connect Web3 wallet to Alpha portal"},
            {"@type": "HowToStep", "name": "Bridge 0.05 ETH to Alpha L2"},
            {"@type": "HowToStep", "name": "Stake tokens in governance contract"}
          ]
        }
        </script>
      </head>
      <body>
        <p>Campaign Deadline: November 15, 2026</p>
        <p>Total pool: 50 million ALPHA tokens</p>
      </body>
    </html>
    """
    res = await adapter.extract(url, mock_html)
    assert len(res.tasks) == 3
    assert res.tasks[0].title == "Connect Web3 wallet to Alpha portal"
    assert res.tasks[1].category == "On-chain"
    assert res.deadline_status == "Verified"
    assert res.deadline is not None
    assert res.deadline.year == 2026
    assert res.deadline.month == 11
    assert "50 million ALPHA tokens" in res.reward_info
    assert res.source_attribution == "Structured JSON-LD Parser"

@pytest.mark.asyncio
async def test_actionability_classification_and_deadline_fixture():
    """
    Regression test using fixtures for:
    - Actionable tasks
    - Informational descriptions
    - Team responsibilities
    - Recurring reward schedules
    - Unknown deadlines
    - Navigation links
    """
    from app.services.adapters.base import ActionabilityStatus

    adapter = GenericAdapter()
    url = "https://example-airdrop.com/zk-campaign"
    fixture_html = """
    <html>
      <head>
        <title>ZK Ecosystem Campaign Guide</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "ZK Campaign Steps",
          "step": [
            {"@type": "HowToStep", "name": "Participants submit activities via a dedicated form through self-reporting"},
            {"@type": "HowToStep", "name": "Gitcoin reviews reports in collaboration with Community Moderators"},
            {"@type": "HowToStep", "name": "Discord Admins – Supporting engagement and ensuring smooth day-to-day operations"},
            {"@type": "HowToStep", "name": "Rewards are distributed at the end of each month"},
            {"@type": "HowToStep", "name": "Engage in community discussions to help onboard new users"},
            {"@type": "HowToStep", "name": "Receive guidance on tracking and reporting contributions for rewards"},
            {"@type": "HowToStep", "name": "Access structured activities, Squads, and engagement opportunities"}
          ]
        }
        </script>
      </head>
      <body>
        <header>
          <nav>
            <a href="/explore">Explore Campaigns</a>
            <a href="/claims">Claim Airdrops</a>
          </nav>
        </header>
        <div class="sidebar">
          <a href="/trending">Trending Quests</a>
        </div>
        <p>Rewards pool: 5 million $ZK tokens</p>
      </body>
    </html>
    """
    res = await adapter.extract(url, fixture_html)

    # 1. Unknown Deadlines & Recurring Schedule
    assert res.deadline is None
    assert res.deadline_status == "Unknown"
    assert "5 million $ZK tokens" in res.reward_info

    # 2. Navigation filtering
    all_titles = [t.title for t in res.tasks]
    assert not any("Explore Campaigns" in t for t in all_titles)
    assert not any("Claim Airdrops" in t for t in all_titles)
    assert not any("Trending Quests" in t for t in all_titles)

    # 3. Actionable tasks
    actionable = [t for t in res.tasks if t.actionability == ActionabilityStatus.ACTIONABLE]
    assert any("submit activities via a dedicated form" in t.title for t in actionable)
    assert any("Engage in community discussions" in t.title for t in actionable)

    # 4. Informational descriptions & Team responsibilities
    informational = [t for t in res.tasks if t.actionability == ActionabilityStatus.INFORMATIONAL]
    assert any("Gitcoin reviews reports" in t.title for t in informational)
    assert any("Discord Admins" in t.title for t in informational)
    assert any("Access structured activities" in t.title for t in informational)

    # 5. Recurring reward schedules
    reward_sched = next(t for t in res.tasks if "Rewards are distributed" in t.title)
    assert reward_sched.actionability == ActionabilityStatus.INFORMATIONAL
    assert reward_sched.recurrence == "Monthly"

    # 6. Review Required / Vague task
    review_req = [t for t in res.tasks if t.actionability == ActionabilityStatus.REVIEW_REQUIRED]
    assert any("Receive guidance" in t.title for t in review_req)

    # 7. Metadata preservation on every task
    for t in res.tasks:
        assert t.source_url == url
        assert t.evidence_snippet is not None
        assert t.extraction_method is not None
        assert t.confidence_score > 0
        assert t.verification_status in ["Verified", "Inferred"]
