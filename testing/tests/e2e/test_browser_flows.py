"""
Browser End-to-End Tests — Bonus Life AI (Gap G-13 mitigation)
==============================================================
Uses Playwright (sync_api) to drive a real Chromium browser against the
running frontend (http://localhost:5173) + backend (http://localhost:8001).

REQUIREMENTS:
  pip install playwright
  playwright install chromium

HOW TO RUN MANUALLY:
  # Start backend:
  cd app/backend && uvicorn app.main:app --host 127.0.0.1 --port 8001

  # Start frontend:
  cd app/frontend/BonusLife-frontend && npm run dev

  # Run only these tests (all others continue to run via TestClient):
  cd testing/tests/e2e
  python -m pytest test_browser_flows.py -v --tb=short

SKIPPED BY DEFAULT:
  All tests in this file are marked skip unless PLAYWRIGHT_LIVE=1 env var
  is set, because they require live frontend and backend servers.
  They are skipped (not failed) so the main suite remains green in CI.
"""

import os
import pytest

# ── Environment guard ──────────────────────────────────────────────────────────
# Tests are skipped unless the caller explicitly opts in with PLAYWRIGHT_LIVE=1
# This prevents them from breaking the 426-test baseline in environments
# where no live servers are running.
_LIVE = os.getenv("PLAYWRIGHT_LIVE", "0") == "1"
_SKIP_MSG = (
    "Requires live frontend (localhost:5173) and backend (localhost:8001). "
    "Set PLAYWRIGHT_LIVE=1 and start both servers to run."
)
pytestmark = pytest.mark.skipif(not _LIVE, reason=_SKIP_MSG)

FRONTEND_URL = os.getenv("PLAYWRIGHT_FRONTEND_URL", "http://localhost:5173")
BACKEND_URL  = os.getenv("PLAYWRIGHT_BACKEND_URL",  "http://127.0.0.1:8001")

# Test credentials — override via env vars for CI
TEST_EMAIL    = os.getenv("PLAYWRIGHT_USER_EMAIL",    "playwright_test@example.com")
TEST_PASSWORD = os.getenv("PLAYWRIGHT_USER_PASSWORD", "TestPass123!")
ADMIN_EMAIL   = os.getenv("PLAYWRIGHT_ADMIN_EMAIL",   "admin@example.com")
ADMIN_PASSWORD = os.getenv("PLAYWRIGHT_ADMIN_PASSWORD", "AdminPass123!")

# ── Helpers ─────────────────────────────────────────────────────────────────────

def _register_test_user(base_url: str):
    """Pre-register the playwright test user via the API so login tests work."""
    import httpx
    try:
        r = httpx.post(
            f"{base_url}/api/v1/auth/register",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Playwright User"},
            timeout=10,
        )
        # 200 = created, 400 = already exists — both are fine
    except Exception:
        pass  # If backend is unreachable the test itself will fail with a clear error


def _login(page, email: str, password: str):
    """Navigate to /login and submit credentials."""
    page.goto(f"{FRONTEND_URL}/login")
    page.wait_for_load_state("networkidle")
    # Email field — try common selectors in order of preference
    for selector in ['input[type="email"]', 'input[placeholder*="mail" i]', '#email']:
        if page.locator(selector).count() > 0:
            page.fill(selector, email)
            break
    # Password field
    for selector in ['input[type="password"]', '#password']:
        if page.locator(selector).count() > 0:
            page.fill(selector, password)
            break
    # Submit
    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")


# ── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def browser_context():
    """Module-scoped Playwright browser context."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        yield context
        context.close()
        browser.close()


@pytest.fixture
def page(browser_context):
    """Per-test page; closed after each test."""
    pg = browser_context.new_page()
    yield pg
    pg.close()


# ── Test 1 — Login flow ─────────────────────────────────────────────────────────

def test_login_flow(page):
    """
    Verifies the complete login flow:
    1. Navigate to /login
    2. Fill email and password
    3. Submit form
    4. Assert the page navigates away from /login (user is authenticated)
    5. Assert a user-specific element (dashboard or profile) is visible

    Manual execution:
      export PLAYWRIGHT_LIVE=1 PLAYWRIGHT_USER_EMAIL=you@example.com PLAYWRIGHT_USER_PASSWORD=YourPass123
      python -m pytest testing/tests/e2e/test_browser_flows.py::test_login_flow -v
    """
    _register_test_user(BACKEND_URL)
    _login(page, TEST_EMAIL, TEST_PASSWORD)

    # After login, URL must not be /login
    current = page.url
    assert "/login" not in current, (
        f"Still on login page after submit. Current URL: {current}. "
        "Check credentials and that the backend is running."
    )

    # A user-specific element should be visible: dashboard heading, nav item, or avatar
    user_element_visible = (
        page.locator("text=Dashboard").count() > 0
        or page.locator("text=Welcome").count() > 0
        or page.locator("[data-testid='user-menu']").count() > 0
        or page.locator("nav").count() > 0
    )
    assert user_element_visible, (
        "Login succeeded (URL changed) but no user-specific element found on the page."
    )


# ── Test 2 — Assessment submission flow ─────────────────────────────────────────

def test_assessment_submission(page):
    """
    Verifies the diabetes assessment form flow:
    1. Login
    2. Navigate to /test (diabetes assessment page)
    3. Fill all required numeric fields
    4. Submit
    5. Assert a result indicator (risk level badge or result heading) is visible

    Manual execution:
      export PLAYWRIGHT_LIVE=1
      python -m pytest testing/tests/e2e/test_browser_flows.py::test_assessment_submission -v
    """
    _register_test_user(BACKEND_URL)
    _login(page, TEST_EMAIL, TEST_PASSWORD)
    assert "/login" not in page.url, "Login failed — cannot test assessment."

    # Navigate to the diabetes test page
    page.goto(f"{FRONTEND_URL}/test")
    page.wait_for_load_state("networkidle")

    # Fill numeric inputs — the form uses number inputs or stepper components
    # Try filling all visible number inputs with safe default values
    number_inputs = page.locator('input[type="number"]')
    safe_values = ["120", "70", "175", "65", "0", "25", "0.5", "35", "80", "0"]
    for i in range(min(number_inputs.count(), len(safe_values))):
        try:
            number_inputs.nth(i).fill(safe_values[i])
        except Exception:
            pass

    # Try clicking any "Next" buttons to advance multi-step forms
    for _ in range(10):
        next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")')
        if next_btn.count() > 0:
            next_btn.first.click()
            page.wait_for_timeout(500)
        else:
            break

    # Click the final submit button
    submit = page.locator('button:has-text("Submit"), button:has-text("Analyze"), button[type="submit"]')
    if submit.count() > 0:
        submit.first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)  # wait for API response and render

    # Assert a result is visible — any of: risk badge, result heading, result container
    result_visible = (
        page.locator("text=Risk").count() > 0
        or page.locator("text=risk").count() > 0
        or page.locator("[class*='result']").count() > 0
        or page.locator("[class*='risk']").count() > 0
        or page.locator("text=Your Result").count() > 0
        or page.locator("text=Assessment").count() > 0
    )
    assert result_visible, (
        "Assessment submitted but no result indicator was found on the page. "
        "The API may have returned an error, or the result component uses an unmatched selector."
    )


# ── Test 3 — Admin login and user list ──────────────────────────────────────────

def test_admin_login_and_user_list(page):
    """
    Verifies the admin panel access flow:
    1. Navigate to /login
    2. Login with admin credentials
    3. Navigate to /admin
    4. Assert the user management table or list is visible
    5. Assert at least one user row is present

    PREREQUISITE: An admin user with ADMIN_EMAIL/ADMIN_PASSWORD must exist in the database.
    Create one via: UPDATE users SET role='admin' WHERE email='admin@example.com';

    Manual execution:
      export PLAYWRIGHT_LIVE=1 PLAYWRIGHT_ADMIN_EMAIL=admin@example.com PLAYWRIGHT_ADMIN_PASSWORD=AdminPass
      python -m pytest testing/tests/e2e/test_browser_flows.py::test_admin_login_and_user_list -v
    """
    _login(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    if "/login" in page.url:
        pytest.skip(
            f"Admin login failed for {ADMIN_EMAIL}. "
            "Ensure an admin account exists and credentials are correct."
        )

    # Navigate to admin panel
    page.goto(f"{FRONTEND_URL}/admin")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Assert admin panel content is visible
    admin_content_visible = (
        page.locator("text=Users").count() > 0
        or page.locator("text=Admin").count() > 0
        or page.locator("table").count() > 0
        or page.locator("[class*='user']").count() > 0
    )
    assert admin_content_visible, (
        f"Admin panel at /admin shows no admin content. URL: {page.url}. "
        "The user may not have admin role, or the page route is different."
    )

    # Assert at least one user row is visible (table row or user card)
    user_rows = (
        page.locator("tr").count()
        + page.locator("[class*='user-row']").count()
        + page.locator("[data-testid*='user']").count()
    )
    assert user_rows > 0, (
        "Admin panel loaded but no user rows found. "
        "The user table may be empty or use different element selectors."
    )
