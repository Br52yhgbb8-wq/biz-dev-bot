import asyncio
import os
import random
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.contact import Contact

try:
    from playwright.async_api import async_playwright, BrowserContext, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


PROFILE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "linkedin_profile")


class LinkedInBrowser:
    """Manages a persistent Playwright browser for LinkedIn."""

    def __init__(self):
        self._playwright = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self, headless: bool = False) -> str:
        """Launch browser. Returns status message."""
        if not PLAYWRIGHT_AVAILABLE:
            return "Playwright is not installed. Run: pip install playwright && playwright install chromium"

        if self._running:
            return "Browser is already running"

        self._playwright = await async_playwright().start()
        os.makedirs(PROFILE_DIR, exist_ok=True)

        self._context = await self._playwright.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=headless,
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="Asia/Shanghai",
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )

        self._page = await self._context.new_page()
        await self._page.goto("https://www.linkedin.com")
        await self._random_delay(2, 4)

        self._running = True
        return "Browser launched. Log in to LinkedIn in the opened window."

    async def stop(self):
        """Close browser and clean up."""
        self._running = False
        if self._context:
            await self._context.close()
            self._context = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        self._page = None

    @property
    async def is_logged_in(self) -> bool:
        """Check if logged in to LinkedIn by looking for nav elements."""
        if not self._page:
            return False
        try:
            result = await self._page.evaluate(
                "() => { const nav = document.querySelector('.global-nav__me'); const feed = document.querySelector('.feed-identity-module'); return !!(nav || feed); }"
            )
            return result
        except Exception:
            return False

    async def search_people(self, keywords: str, location: str = "", limit: int = 10) -> list[dict]:
        """Search LinkedIn for people by keywords."""
        if not self._running or not self._page:
            raise RuntimeError("Browser not running. Call /api/linkedin/connect first.")

        search_url = f"https://www.linkedin.com/search/results/people/?keywords={keywords}"
        if location:
            search_url += f"&geoUrn=%5B%22{location}%22%5D"
        search_url += "&origin=GLOBAL_SEARCH_HEADER&sid=~"

        await self._page.goto(search_url, wait_until="networkidle")
        await self._random_delay(3, 5)

        for _ in range(3):
            await self._page.evaluate("window.scrollBy(0, 500)")
            await self._random_delay(1, 2)

        results = await self._page.evaluate(f"""() => {{
            const cards = document.querySelectorAll('.reusable-search__result-container');
            const items = [];
            const maxItems = {limit};
            cards.forEach(card => {{
                if (items.length >= maxItems) return;
                const nameEl = card.querySelector('.entity-result__title-text a');
                const titleEl = card.querySelector('.entity-result__primary-subtitle');
                const locEl = card.querySelector('.entity-result__secondary-subtitle');
                const imgEl = card.querySelector('.presence-entity__image, .ivm-image-view-model__circle-image');

                const name = nameEl?.innerText?.trim() || '';
                const profile_url = nameEl?.href?.split('?')[0] || '';
                const title = titleEl?.innerText?.trim() || '';
                const location_ = locEl?.innerText?.trim() || '';
                const img_url = imgEl?.src || '';

                if (name && !items.find(i => i.profile_url === profile_url)) {{
                    items.push({{ name, title, location: location_, profile_url, img_url }});
                }}
            }});
            return items;
        }}""")

        return results[:limit]

    async def get_profile(self, profile_url: str) -> dict:
        """Extract detailed profile data from a LinkedIn profile page."""
        if not self._page:
            raise RuntimeError("Browser not running")

        await self._page.goto(profile_url, wait_until="networkidle")
        await self._random_delay(3, 5)

        profile = await self._page.evaluate("""() => {
            const data = {};

            const nameEl = document.querySelector('h1');
            data.name = nameEl?.innerText?.trim() || '';

            const headlineEl = document.querySelector('.text-body-medium');
            data.headline = headlineEl?.innerText?.trim() || '';

            const aboutEl = document.querySelector('.display-flex.ph5.pv3 .inline-show-more-text');
            data.about = aboutEl?.innerText?.trim() || '';

            const expSection = document.querySelector('#experience ~ .pvs-list__outer-container');
            if (expSection) {
                const expItems = expSection.querySelectorAll('.pvs-entity--padded');
                data.experience = Array.from(expItems).slice(0, 5).map(item => {
                    const titleEl = item.querySelector('.t-bold span[aria-hidden]');
                    const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden]');
                    return {
                        title: titleEl?.innerText?.trim() || '',
                        company: companyEl?.innerText?.trim() || '',
                    };
                });
            }

            const eduSection = document.querySelector('#education ~ .pvs-list__outer-container');
            if (eduSection) {
                const eduItems = eduSection.querySelectorAll('.pvs-entity--padded');
                data.education = Array.from(eduItems).slice(0, 3).map(item => {
                    const schoolEl = item.querySelector('.t-bold span[aria-hidden]');
                    return schoolEl?.innerText?.trim() || '';
                });
            }

            const skillEls = document.querySelectorAll('.pvs-list__outer-container .pvs-entity--padded .t-bold span[aria-hidden]');
            data.skills = Array.from(skillEls).slice(0, 10).map(el => el?.innerText?.trim()).filter(Boolean);

            return data;
        }""")

        profile["profile_url"] = profile_url
        return profile

    async def export_to_crm(self, results: list[dict], db: AsyncSession) -> dict:
        """Import LinkedIn search results as CRM contacts."""
        imported = 0
        skipped = 0
        for item in results:
            name = item.get("name", "").strip()
            profile_url = item.get("profile_url", "")
            if not name:
                skipped += 1
                continue

            existing = await db.execute(
                select(Contact).where(Contact.linkedin_url == profile_url)
            )
            if existing.scalar_one_or_none():
                skipped += 1
                continue

            contact = Contact(
                name=name,
                title=item.get("title", ""),
                company=item.get("company", ""),
                linkedin_url=profile_url,
                linkedin_profile={
                    "name": name,
                    "headline": item.get("headline", ""),
                    "about": item.get("about", ""),
                    "experience": item.get("experience", []),
                    "education": item.get("education", []),
                    "skills": item.get("skills", []),
                },
                source="linkedin",
            )
            db.add(contact)
            imported += 1

        await db.commit()
        return {"imported": imported, "skipped": skipped, "total": imported + skipped}

    async def _random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        await asyncio.sleep(random.uniform(min_sec, max_sec))


linkedin_browser = LinkedInBrowser()
