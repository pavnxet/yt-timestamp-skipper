import sys
import json
import urllib.request
import urllib.error

# ---------------------------------------------------------
# UPDATE THESE VARIABLES WITH YOUR ACTUAL TURSO CREDENTIALS
# ---------------------------------------------------------
TURSO_DB_URL = "https://your-database-name.turso.io"
TURSO_AUTH_TOKEN = "your_auth_token_here"

def test_connection():
    if TURSO_AUTH_TOKEN == "your_auth_token_here" or "your-database-name" in TURSO_DB_URL:
        print("❌ Error: Please edit this file and replace TURSO_DB_URL and TURSO_AUTH_TOKEN with your actual credentials.")
        sys.exit(1)

    # Turso's HTTP API needs https://, not libsql://
    base_url = TURSO_DB_URL.replace("libsql://", "https://").rstrip('/')
    url = f"{base_url}/v2/pipeline"
    
    headers = {
        "Authorization": f"Bearer {TURSO_AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # We send a basic SELECT 1 to validate the connection
    payload = {
        "requests": [
            {
                "type": "execute",
                "stmt": {
                    "sql": "SELECT 1;",
                    "args": []
                }
            },
            {
                "type": "close"
            }
        ]
    }
    
    data = json.dumps(payload).encode('utf-8')
    
    print(f"Testing connection to: {TURSO_DB_URL}...")
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
            # Check if the query was successful
            if "results" in res_data and len(res_data["results"]) > 0:
                first_result = res_data["results"][0]
                if first_result.get("type") == "ok":
                    print("✅ Connection successful! Your credentials are valid and working.")
                    return
            
            print("❌ Received an unexpected response from the server:")
            print(json.dumps(res_data, indent=2))
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code} {e.reason}")
        if e.code == 401:
            print("   -> 401 Unauthorized: This usually means your Auth Token is invalid or expired.")
        elif e.code == 404:
            print("   -> 404 Not Found: This usually means your Database URL is incorrect.")
        else:
            try:
                print("   -> Response details:", e.read().decode('utf-8'))
            except:
                pass
    except urllib.error.URLError as e:
        print(f"❌ Network Error: Failed to reach the server. ({e.reason})")
        print("   -> Double check that your Database URL is formatted correctly (e.g., https://my-db-username.turso.io)")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    test_connection()
