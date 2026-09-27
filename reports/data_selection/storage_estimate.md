# Dataset Storage Estimate & Selection Strategy

## 1. Objectron (Target: ~2.5 GB)
- Selected Instances: 5800
- Views per instance: 5
- Total Raw Images: 29000
- Estimated Raw Storage: 2.77 GB

## 2. PACO-LVIS (Target: ~3.0 GB)
- Selected Instances (Images): 17500
- Total Raw Images: 17500
- Estimated Raw Storage: 2.50 GB

## 3. Total
- **Total Estimated Raw Download Storage: 5.27 GB**
- **Note:** After cropping and resizing to 224x224, the final dataset size will be significantly smaller (approx ~1.5 GB), but this estimate ensures the download phase does not violate the 6GB constraint.
