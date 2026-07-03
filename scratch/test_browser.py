import os
import asyncio
from playwright.async_api import async_playwright

async def run_browser_test():
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../wisdom-of-the-doctors.html'))
    file_url = f"file://{file_path}"
    print(f"Loading local HTML file: {file_url}...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Create a page
        page = await browser.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: [{msg.type}] {msg.text}"))
        
        # Load the file
        await page.goto(file_url)
        await page.wait_for_timeout(2000)
        
        # Take a screenshot
        screenshot_path = os.path.join(os.path.dirname(__file__), 'screenshot.png')
        await page.screenshot(path=screenshot_path)
        print(f"Saved browser screenshot to: {screenshot_path}")
        
        # Extract sidebar HTML
        sidebar_html = await page.eval_on_selector("aside.sidebar", "el => el.innerHTML")
        print("\n--- HTML inside <aside class='sidebar'> ---")
        print(sidebar_html)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_browser_test())
