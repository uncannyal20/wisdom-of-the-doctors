import sys
import urllib.request
import urllib.error

def check_url(url):
    if not url.startswith('http'):
        url = 'https://' + url

    print(f"Fetching URL: {url}...")
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as res:
            html = res.read().decode('utf-8')
            
        print("✅ HTML fetched successfully!")
        
        # Check for elements
        has_insights_container = "insights-container" in html
        has_sessions_container = "sessions-container" in html
        has_toggle_citations = "toggleCitations" in html
        
        print("\n--- Diagnostics ---")
        print(f"Has 'sessions-container' (Past Sessions): {has_sessions_container}")
        print(f"Has 'insights-container' (Saved Insights): {has_insights_container}")
        print(f"Has 'toggleCitations' function: {has_toggle_citations}")
        
        if has_insights_container and has_toggle_citations:
            print("\n🎉 SUCCESS: The latest version of the code is fully deployed on the live server!")
        else:
            print("\n❌ FAILURE: The live server is still serving an old deployment of the HTML page.")
            
    except urllib.error.HTTPError as e:
        print("❌ HTTP Error:", e.code, e.reason)
    except Exception as e:
        print("❌ Error fetching URL:", str(e))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 fetch_live_html.py <website-url>")
        sys.exit(1)
    check_url(sys.argv[1])
