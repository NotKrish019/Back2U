import cv2
import numpy as np
import os

def extract_sprites(input_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Failed to load")
        return
        
    H, W, C = img.shape
    cols = 15
    rows = 7
    cell_w = W // cols
    cell_h = H // rows
    
    alpha = img[:, :, 3]
    _, bin_mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)
    
    # Get all connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(bin_mask, connectivity=8)
    
    # Group components by cell
    cell_components = {}
    for r in range(rows):
        for c in range(cols):
            cell_components[(r, c)] = []
            
    for label_id in range(1, num_labels):
        x, y, w, h, area = stats[label_id]
        if area < 5:
            continue
            
        cx, cy = centroids[label_id]
        c = int(cx // cell_w)
        r = int(cy // cell_h)
        if r >= rows: r = rows - 1
        if c >= cols: c = cols - 1
        
        cell_components[(r, c)].append(label_id)
        
    saved_count = 0
    # For each cell, find bounding box of all its components
    for (r, c), comps in cell_components.items():
        if not comps:
            continue
            
        min_x = W
        min_y = H
        max_x = 0
        max_y = 0
        
        for comp in comps:
            x, y, w, h, _ = stats[comp]
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x + w)
            max_y = max(max_y, y + h)
            
        pad = 5
        min_x = max(0, min_x - pad)
        min_y = max(0, min_y - pad)
        max_x = min(W, max_x + pad)
        max_y = min(H, max_y + pad)
        
        # We need to extract ONLY the pixels of these components, 
        # so we don't accidentally grab a bleeding arm from an adjacent cell's component.
        # But wait, if the arm bled into this bounding box, standard slicing captures it.
        # So we should create a blank ROI and only copy the pixels of the correct components!
        roi = np.zeros((max_y - min_y, max_x - min_x, 4), dtype=np.uint8)
        
        for comp in comps:
            comp_mask = labels[min_y:max_y, min_x:max_x] == comp
            roi[comp_mask] = img[min_y:max_y, min_x:max_x][comp_mask]
            
        cv2.imwrite(os.path.join(output_dir, f"peep_{saved_count}.png"), roi)
        saved_count += 1
        
    print(f"Extracted {saved_count} sprites perfectly.")

if __name__ == '__main__':
    extract_sprites("public/assets/crowd-sprite.png", "public/assets/peeps")
