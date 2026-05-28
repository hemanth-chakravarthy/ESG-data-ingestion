"""Quick test script for the upload endpoint."""
import requests
import json

BASE = "http://127.0.0.1:8000/api/v1"

# Register or Login
resp = requests.post(f"{BASE}/auth/register/", json={
    "email": "test@example.com",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User",
    "organization_name": "Test Org",
})
if resp.status_code == 201:
    tokens = resp.json()["tokens"]
else:
    resp = requests.post(f"{BASE}/auth/login/", json={
        "email": "test@example.com",
        "password": "testpass123",
    })
    tokens = resp.json()["tokens"]
headers = {"Authorization": f"Bearer {tokens['access']}"}

print("=== Login OK ===")

# Upload travel data
with open("sample_data/travel_data.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/uploads/",
        headers=headers,
        files={"file": ("travel_data.csv", f, "text/csv")},
        data={"source_type": "TRAVEL"},
    )

print(f"Upload status: {resp.status_code}")
print(json.dumps(resp.json(), indent=2))

batch_id = resp.json()["id"]

# Upload SAP data
with open("sample_data/sap_fuel_data.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/uploads/",
        headers=headers,
        files={"file": ("sap_fuel_data.csv", f, "text/csv")},
        data={"source_type": "SAP"},
    )
print(f"\nSAP Upload status: {resp.status_code}")
print(json.dumps(resp.json(), indent=2))

# Upload Utility data
with open("sample_data/utility_data.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/uploads/",
        headers=headers,
        files={"file": ("utility_data.csv", f, "text/csv")},
        data={"source_type": "UTILITY"},
    )
print(f"\nUtility Upload status: {resp.status_code}")
print(json.dumps(resp.json(), indent=2))

# Check dashboard stats
resp = requests.get(f"{BASE}/dashboard/stats/", headers=headers)
print(f"\n=== Dashboard Stats ===")
print(json.dumps(resp.json(), indent=2))

# Check review queue
resp = requests.get(f"{BASE}/records/?has_flags=true", headers=headers)
flagged = resp.json()
print(f"\n=== Flagged Records: {len(flagged)} ===")
for r in flagged[:5]:
    print(f"  - {r['activity_type']} | {r['consumption_value']} {r['unit']} | flags: {[f['flag_type'] for f in r['flags']]}")
