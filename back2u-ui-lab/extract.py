import json
import os

with open("threeui.json") as f:
    data = json.load(f)

for file in data["files"]:
    path = file["path"]
    code = file["code"]
    
    # We want to put them in the current project under src/components/threeui or similar
    # But wait, what paths are specified in the JSON?
    # Let's just create the exact paths from the JSON inside back2u-ui-lab/src/
    
    full_path = os.path.join("src/components/threeui", path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as out:
        out.write(code)
    print(f"Extracted {full_path}")
