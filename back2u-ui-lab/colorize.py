import cv2
import numpy as np
import time

def hex_to_bgr(hex_val):
    hex_val = hex_val.lstrip('#')
    rgb = tuple(int(hex_val[i:i+2], 16) for i in (0, 2, 4))
    return (rgb[2], rgb[1], rgb[0])

def colorize_sprite(input_path, output_path):
    t0 = time.time()
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Failed to load {input_path}")
        return

    H, W, C = img.shape
    if C != 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    alpha_mask = img[:, :, 3] > 200
    white_mask = (mask > 0) & alpha_mask
    white_mask_uint8 = np.uint8(white_mask * 255)
    
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(white_mask_uint8, connectivity=4)
    print(f"Connected components: {num_labels - 1}, time: {time.time()-t0:.2f}s")

    skin_bgrs = [hex_to_bgr(h) for h in ["#F8D5B5", "#EFC09A", "#DFA47A", "#C9825B", "#A96343", "#8B5238", "#6F3F2D", "#4F2D24"]]
    cloth_bgrs = [hex_to_bgr(h) for h in [
        "#A7D8F5", "#C5B5E8", "#3D315B", "#F29BB2", "#FFFFFF", "#202124", 
        "#2C3E50", "#4A6572", "#F39C12", "#7D9A75", "#800020", "#F5F5DC", 
        "#8B4513", "#A9A9A9", "#E8DFD5", "#D8C3A5", "#4B5320", "#5C5C5C"
    ]]
    hair_bgrs = [hex_to_bgr(h) for h in ["#1A1A1A", "#3B2F2F", "#4A3B32", "#665C54", "#DCDCDC", "#EAEAEA", "#8B5A2B", "#2F2F2F"]]
    
    cols = 15
    rows = 7
    cell_w = W // cols
    cell_h = H // rows
    
    # Pre-generate colors for each cell
    cell_colors = {}
    for r in range(rows):
        for c in range(cols):
            cell_colors[(r, c)] = {
                "skin": skin_bgrs[np.random.randint(0, len(skin_bgrs))],
                "cloth1": cloth_bgrs[np.random.randint(0, len(cloth_bgrs))],
                "cloth2": cloth_bgrs[np.random.randint(0, len(cloth_bgrs))],
                "hair": hair_bgrs[np.random.randint(0, len(hair_bgrs))],
            }

    out_img = img.copy()

    for label_id in range(1, num_labels):
        x, y, w, h, area = stats[label_id]
        if area < 10:
            continue
            
        cx, cy = centroids[label_id]
        c = int(cx // cell_w)
        r = int(cy // cell_h)
        if r >= rows: r = rows - 1
        if c >= cols: c = cols - 1
        
        rel_y = (cy - r * cell_h) / cell_h
        
        colors = cell_colors[(r, c)]
        if rel_y < 0.22:
            color = colors["hair"]
        elif rel_y < 0.38:
            color = colors["skin"]
        elif rel_y < 0.65:
            color = colors["cloth1"]
        else:
            color = colors["cloth2"]
            
        # Fast bounding-box masking
        comp_mask = (labels[y:y+h, x:x+w] == label_id)
        
        roi = out_img[y:y+h, x:x+w]
        
        # We need to assign B, G, R correctly
        roi[comp_mask, 0] = color[0]
        roi[comp_mask, 1] = color[1]
        roi[comp_mask, 2] = color[2]
        
        out_img[y:y+h, x:x+w] = roi

    cv2.imwrite(output_path, out_img)
    print(f"Saved in {time.time()-t0:.2f}s")

if __name__ == '__main__':
    colorize_sprite("public/assets/crowd-sprite.png", "public/assets/crowd-sprite.png")
