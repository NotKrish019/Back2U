import os
import requests
import json
from dotenv import load_dotenv

# Load frontend env variables for API key
load_dotenv('frontend/.env.local')
API_KEY = os.getenv("NEXT_PUBLIC_FIREBASE_API_KEY")

def login_and_test():
    # 1. Sign up / Sign in a test user via Firebase REST API
    print("Logging in to Firebase...")
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
    payload = {
        "email": "agenttest@example.com",
        "password": "Password123!",
        "returnSecureToken": True
    }
    res = requests.post(auth_url, json=payload)
    if 'EMAIL_EXISTS' in res.text:
        auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
        res = requests.post(auth_url, json=payload)
    
    if res.status_code != 200:
        print("Firebase auth failed:", res.text)
        return
        
    data = res.json()
    id_token = data.get("idToken")
    print("Got ID token.")
    
    # Let's decode it ourselves to see the structure
    import jwt
    decoded = jwt.decode(id_token, options={"verify_signature": False})
    print("Raw decoded JWT:", json.dumps(decoded, indent=2))
    
    # 2. Call the backend API
    print("\nCalling backend API /retrieval/search...")
    headers = {"Authorization": f"Bearer {id_token}", "Content-Type": "application/json"}
    payload = {"text": "Test Item Description", "top_k": 6}
    api_res = requests.post("http://127.0.0.1:8000/api/v1/retrieval/search", headers=headers, json=payload)
    print("Backend Status:", api_res.status_code)
    print("Backend Response:", api_res.text)

if __name__ == "__main__":
    login_and_test()
