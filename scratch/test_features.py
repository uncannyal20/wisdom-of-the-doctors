import os
import json
import asyncio
from playwright.async_api import async_playwright

async def run_feature_test():
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../wisdom-of-the-doctors.html'))
    file_url = f"file://{file_path}"
    
    print("Starting automated browser test for Past Sessions and Saved Insights...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Force a viewport size
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        
        # 1. Mock Vercel API /api/config
        await page.route("**/api/config", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "supabaseUrl": "https://fake-project.supabase.co",
                "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake"
            })
        ))
        
        # 2. Mock Vercel API /api/sessions
        await page.route("**/api/sessions", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([
                {
                    "id": "session-1",
                    "created_at": "2026-07-03T01:00:00.000Z",
                    "doctor": "augustine",
                    "title": "On finding peace in the restlessness"
                },
                {
                    "id": "session-2",
                    "created_at": "2026-07-03T02:00:00.000Z",
                    "doctor": "sales",
                    "title": "On patience with our daily faults"
                },
                {
                    "id": "session-3",
                    "created_at": "2026-07-03T03:00:00.000Z",
                    "doctor": "therese",
                    "title": "The Little Way of confidence and love"
                }
            ])
        ))
        
        # 3. Mock Vercel API /api/insights
        await page.route("**/api/insights**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([
                {
                    "id": "insight-1",
                    "session_id": "session-3",
                    "doctor": "St. Thérèse of Lisieux",
                    "content": "<p>God only gives us grace for <em>today</em> — not for imagined future troubles. You don't need the strength for tomorrow right now; you only need it when tomorrow comes.</p>",
                    "created_at": "2026-07-03T01:00:00.000Z"
                },
                {
                    "id": "insight-2",
                    "session_id": "session-1",
                    "doctor": "St. Augustine",
                    "content": "<p>Our hearts are restless, O Lord, until they rest in You. In this quiet place of surrender, the noise of the world recedes.</p>",
                    "created_at": "2026-07-03T02:00:00.000Z"
                }
            ])
        ))

        # 4. Mock Supabase Auth Session endpoints
        await page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "id": "fake-user-id",
                "email": "uncannyal20@gmail.com",
                "role": "authenticated"
            })
        ))
        
        # 5. Load the page
        print(f"Loading page with mock authentication and mock api/insights...")
        await page.goto(file_url)
        
        # Force the UI to think it has a valid Supabase auth session
        # (This bypasses network calls to actual Supabase servers which would fail)
        await page.evaluate("""async () => {
            currentUser = { email: "uncannyal20@gmail.com", id: "fake-user-id" };
            userToken = "fake-jwt-token";
            
            // Re-render auth UI and sessions list with mock data
            updateAuthUI(true);
            cachedSessions = [
                {
                    id: "session-1",
                    created_at: "2026-07-03T01:00:00.000Z",
                    doctor: "augustine",
                    title: "On finding peace in the restlessness"
                },
                {
                    id: "session-2",
                    created_at: "2026-07-03T02:00:00.000Z",
                    doctor: "sales",
                    title: "On patience with our daily faults"
                },
                {
                    id: "session-3",
                    created_at: "2026-07-03T03:00:00.000Z",
                    doctor: "therese",
                    title: "The Little Way of confidence and love"
                }
            ];
            renderSessions(cachedSessions);
            savedInsights = [
                {
                    id: "insight-1",
                    session_id: "session-3",
                    doctor: "St. Thérèse of Lisieux",
                    content: "<p>God only gives us grace for <em>today</em> — not for imagined future troubles. You don't need the strength for tomorrow right now; you only need it when tomorrow comes.</p>"
                },
                {
                    id: "insight-2",
                    session_id: "session-1",
                    doctor: "St. Augustine",
                    content: "<p>Our hearts are restless, O Lord, until they rest in You. In this quiet place of surrender, the noise of the world recedes.</p>"
                }
            ];
            renderSaved();
        }""")
        
        await page.wait_for_timeout(1000)
        
        # 6. Capture screenshot
        screenshot_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'sidebar_features_test.png'))
        await page.screenshot(path=screenshot_path)
        print(f"✅ Screenshot taken and saved to: {screenshot_path}")
        
        # 7. Print the rendered HTML of Past Sessions and Saved Insights
        sessions_html = await page.eval_on_selector("#sessions-container", "el => el.innerHTML")
        insights_html = await page.eval_on_selector("#insights-container", "el => el.innerHTML")
        
        print("\n--- Rendered Past Sessions ---")
        print(sessions_html)
        print("\n--- Rendered Saved Insights ---")
        print(insights_html)
        
        # 8. Click on a saved insight to test the modal preview!
        print("\nClicking on the first Saved Insight to verify the modal preview...")
        await page.click(".saved-item:first-child")
        await page.wait_for_timeout(500)
        
        # Take modal screenshot
        modal_screenshot_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'insight_modal_test.png'))
        await page.screenshot(path=modal_screenshot_path)
        print(f"✅ Modal preview screenshot saved to: {modal_screenshot_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_feature_test())
