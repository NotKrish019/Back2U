import sys
import os
import requests
import cv2

sys.path.insert(0, os.path.abspath('scratch/Objectron'))
from objectron.schema import annotation_data_pb2

# Let's try downloading the geometry for a known sequence
seq = "cup/batch-16/47"
geom_url = f"https://storage.googleapis.com/objectron/annotations/{seq}.pbdata"
video_url = f"https://storage.googleapis.com/objectron/videos/{seq}/video.MOV"

print("Downloading geometry...")
resp = requests.get(geom_url)
if resp.status_code == 200:
    sequence = annotation_data_pb2.Sequence()
    sequence.ParseFromString(resp.content)
    print(f"Parsed sequence with {len(sequence.frame_annotations)} frames.")
    
    # Check first frame with annotations
    for frame_idx, frame in enumerate(sequence.frame_annotations):
        if len(frame.annotations) > 0:
            ann = frame.annotations[0]
            print(f"Frame {frame_idx} has {len(ann.keypoints)} keypoints. Visibility: {ann.visibility}")
            pts = [(kp.point_2d.x, kp.point_2d.y) for kp in ann.keypoints]
            print("Points:", pts[:2], "...")
            break
            
    print("Trying to grab a frame using OpenCV...")
    cap = cv2.VideoCapture(video_url)
    if not cap.isOpened():
        print("Failed to open video URL.")
    else:
        # seek to frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame_img = cap.read()
        if ret:
            print(f"Successfully grabbed frame! Shape: {frame_img.shape}")
        else:
            print("Failed to read frame.")
        cap.release()
else:
    print(f"Failed to download geometry: {resp.status_code}")
