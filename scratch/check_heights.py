import os
import asyncio
from playwright.async_api import async_playwright

async def check_heights():
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../wisdom-of-the-doctors.html'))
    file_url = f"file://{file_path}"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        # Set viewport to standard laptop size (1280x800)
        await page.set_viewport_size({"width": 1280, "height": 800})
        await page.goto(file_url)
        await page.wait_for_timeout(1000)
        
        # Check computed heights
        metrics = await page.evaluate("""() => {
            const sidebar = document.querySelector('aside.sidebar');
            const topSec = document.querySelector('.sidebar-section');
            const authSec = document.getElementById('auth-section');
            const lists = document.querySelectorAll('.saved-list');
            
            return {
                sidebarHeight: sidebar ? sidebar.getBoundingClientRect().height : 0,
                topSecHeight: topSec ? topSec.getBoundingClientRect().height : 0,
                authSecHeight: authSec ? authSec.getBoundingClientRect().height : 0,
                sessionsHeight: lists[0] ? lists[0].getBoundingClientRect().height : 0,
                insightsHeight: lists[1] ? lists[1].getBoundingClientRect().height : 0
            };
        }""")
        
        print("=== COMPUTED ELEMENT HEIGHTS (Viewport: 800px) ===")
        for key, val in metrics.items():
            print(f"{key}: {val}px")
            
        # Set viewport to smaller screen (1280x600)
        await page.set_viewport_size({"width": 1280, "height": 600})
        await page.wait_for_timeout(500)
        
        metrics_small = await page.evaluate("""() => {
            const sidebar = document.querySelector('aside.sidebar');
            const topSec = document.querySelector('.sidebar-section');
            const authSec = document.getElementById('auth-section');
            const lists = document.querySelectorAll('.saved-list');
            
            return {
                sidebarHeight: sidebar ? sidebar.getBoundingClientRect().height : 0,
                topSecHeight: topSec ? topSec.getBoundingClientRect().height : 0,
                authSecHeight: authSec ? authSec.getBoundingClientRect().height : 0,
                sessionsHeight: lists[0] ? lists[0].getBoundingClientRect().height : 0,
                insightsHeight: lists[1] ? lists[1].getBoundingClientRect().height : 0
            };
        }""")
        
        print("\n=== COMPUTED ELEMENT HEIGHTS (Viewport: 600px) ===")
        for key, val in metrics_small.items():
            print(f"{key}: {val}px")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check_heights())
