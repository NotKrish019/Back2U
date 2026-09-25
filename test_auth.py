import time
import os
import firebase_admin
from firebase_admin import auth
import jwt

project_id = "liveproject-12091"
firebase_admin.initialize_app(options={'projectId': project_id})

token = jwt.encode({"uid": "test", "aud": project_id}, "secret", algorithm="HS256")

start = time.time()
try:
    auth.verify_id_token(token)
except Exception as e:
    print("Error:", e)
print("Time taken:", time.time() - start)
