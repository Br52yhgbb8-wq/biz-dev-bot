import pandas as pd
import os

data_dir = '/Users/shichen/Documents/业务自动化bot/biz-dev-bot/data'
os.makedirs(data_dir, exist_ok=True)

# ── 1. 空调系列.xlsx ──
acdc_data = {
    'Category': ['ACDC Solar Air Conditioner'] * 4,
    'Model': ['UNI-AC09-ACDC', 'UNI-AC12-ACDC', 'UNI-AC18-ACDC', 'UNI-AC24-ACDC'],
    'BTU': ['9,000', '12,000', '18,000', '24,000'],
    'EXW Factory In USD': [387.00, 467.00, 579.00, 691.00],
    'MOQ': ['10 units'] * 4,
}
df1 = pd.DataFrame(acdc_data)
df1.to_excel(os.path.join(data_dir, '空调系列.xlsx'), index=False, sheet_name='ACDC Products')
print(f"[OK] 空调系列.xlsx (4 products)")

# ── 2. 一体承压热水器系列.xlsx ──
pvswh_data = {
    'Category': ['Hybrid Pressurized Water Heater'] * 3,
    'Model': ['UNI-PVSWH-60', 'UNI-PVSWH-80', 'UNI-PVSWH-100'],
    'Capacity (L)': [60, 80, 100],
    'EXW Factory In USD': [131.00, 141.00, 149.00],
    'Type': ['Pressurized', 'Pressurized', 'Pressurized'],
}
df2 = pd.DataFrame(pvswh_data)
df2.to_excel(os.path.join(data_dir, '一体承压热水器系列.xlsx'), index=False, sheet_name='PVSWH Products')
print(f"[OK] 一体承压热水器系列.xlsx (3 products)")

# ── 3. 一体非承压热水器系列.xlsx ──
s02_data = {
    'Category': ['Non-Pressurized Water Heater'],
    'Model': ['UNI-S02-100'],
    'Capacity (L)': [100],
    'EXW Factory In USD': [58.00],
    'Type': ['Non-Pressurized / Off-grid'],
}
df3 = pd.DataFrame(s02_data)
df3.to_excel(os.path.join(data_dir, '一体非承压热水器系列.xlsx'), index=False, sheet_name='S02 Products')
print(f"[OK] 一体非承压热水器系列.xlsx (1 product)")

# ── 4. 热泵系列.xlsx ──
heatpump_data = {
    'Category': ['Heat Pump'] * 2,
    'Model': ['UNP-HP-A1', 'UNP-HP-A2'],
    'Capacity (kW)': [7.0, 10.0],
    'EXW Factory In USD': [1299.00, 1799.00],
    'COP': [4.5, 4.8],
}
df4 = pd.DataFrame(heatpump_data)
df4.to_excel(os.path.join(data_dir, '热泵系列.xlsx'), index=False, sheet_name='Heat Pump Products')
print(f"[OK] 热泵系列.xlsx (2 products)")

print("\n[DONE] All 4 sample Excel files created in data/")
