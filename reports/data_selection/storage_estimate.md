# Dataset Storage Estimate & Selection Strategy

## 1. Objectron (Target: ~2.5 GB)
- Selected Instances: 5000
- Views per instance: 5
- Total Raw Images: 25000
- Estimated Raw Storage: 2.38 GB

## 2. PACO-LVIS (Target: ~3.0 GB)
- Selected Instances (Images): 15500
- Total Raw Images: 15500
- Estimated Raw Storage: 2.22 GB

## 3. Total
- **Total Estimated Raw Download Storage: 4.60 GB**
- **Note:** After cropping and resizing to 224x224, the final dataset size will be significantly smaller (approx ~1.5 GB), but this estimate ensures the download phase does not violate the 6GB constraint.
