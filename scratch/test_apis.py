import os
import json
import urllib.request
import urllib.error

def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(__file__), '../.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key_val = line.split('=', 1)
                    if len(key_val) == 2:
                        env[key_val[0].strip()] = key_val[1].strip()
    return env

def test_anthropic_model(anthropic_key, model_name):
    print(f"Testing model: {model_name}...")
    try:
        url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": model_name,
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Say hi"}]
        }
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': anthropic_key,
            'anthropic-version': '2023-06-01'
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print(f"✅ Successful! Reply: {data.get('content', [{}])[0].get('text')}")
    except urllib.error.HTTPError as e:
        print(f"❌ Failed with HTTP Error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    env = load_env()
    anthropic_key = env.get('ANTHROPIC_API_KEY')
    if not anthropic_key:
        print("No Anthropic Key found!")
        return

    test_anthropic_model(anthropic_key, "claude-sonnet-4-6")
    test_anthropic_model(anthropic_key, "claude-3-5-sonnet-latest")
    test_anthropic_model(anthropic_key, "claude-3-5-sonnet-20241022")

if __name__ == "__main__":
    main()
