import zipfile
import glob
import os
import shutil
from pathlib import Path

def get_long_path(path_str):
    # Convert to absolute path and prepend \\?\ for Windows long paths
    abs_path = os.path.abspath(path_str)
    if not abs_path.startswith('\\\\?\\'):
        abs_path = '\\\\?\\' + abs_path
    return abs_path

# Create destination directories
headphones_dest = get_long_path('data/raw/headphones')
earphones_dest = get_long_path('data/raw/earphones')
os.makedirs(headphones_dest, exist_ok=True)
os.makedirs(earphones_dest, exist_ok=True)

# Extract using long paths
print("Extracting headphones...")
temp_hp = get_long_path('data/raw/temp_hp')
with zipfile.ZipFile('data/raw/Headphones.v10i.coco.zip', 'r') as zf:
    for member in zf.namelist():
        # Manually construct absolute long path
        member_path = os.path.join(temp_hp, member.replace('/', '\\'))
        member_dir = os.path.dirname(member_path)
        os.makedirs(member_dir, exist_ok=True)
        if not member.endswith('/'):
            with zf.open(member) as source, open(member_path, 'wb') as target:
                shutil.copyfileobj(source, target)

print("Extracting earphones...")
temp_ep = get_long_path('data/raw/temp_ep')
with zipfile.ZipFile('data/raw/Earphones.v1-earphones.folder.zip', 'r') as zf:
    for member in zf.namelist():
        # Manually construct absolute long path
        member_path = os.path.join(temp_ep, member.replace('/', '\\'))
        member_dir = os.path.dirname(member_path)
        os.makedirs(member_dir, exist_ok=True)
        if not member.endswith('/'):
            with zf.open(member) as source, open(member_path, 'wb') as target:
                shutil.copyfileobj(source, target)

print("Moving images...")
for root, dirs, files in os.walk(temp_hp):
    for file in files:
        if file.lower().endswith('.jpg'):
            src = os.path.join(root, file)
            dst = os.path.join(headphones_dest, file)
            # handle duplicates if any by renaming
            if os.path.exists(dst):
                dst = os.path.join(headphones_dest, "dup_" + file)
            shutil.move(src, dst)

for root, dirs, files in os.walk(temp_ep):
    for file in files:
        if file.lower().endswith('.jpg'):
            src = os.path.join(root, file)
            dst = os.path.join(earphones_dest, file)
            # handle duplicates if any by renaming
            if os.path.exists(dst):
                dst = os.path.join(earphones_dest, "dup_" + file)
            shutil.move(src, dst)
            
print("Done extracting and moving.")
