#!/usr/bin/env python3
"""UniEpu Excel → JSON — 含价格 + 全部技术参数提取"""

import pandas as pd, json, os, re
from collections import defaultdict

FILE_MAPPING = {
    '空调系列.xlsx': {'category': 'acdc', 'series_name': 'ACDC Hybrid Solar AC', 'series_model': 'UNP-ACDC'},
    '一体承压热水器系列.xlsx': {'category': 'pvswh', 'series_name': 'Pressurized Heater', 'series_model': 'UNP-PVSWH'},
    '一体非承压热水器系列.xlsx': {'category': 's02', 'series_name': 'Non-Pressurized Heater', 'series_model': 'UNP-S02'},
    '热泵系列.xlsx': {'category': 'heatpump', 'series_name': 'All-in-One Heat Pump', 'series_model': 'UNP-HP'},
    '电热水器.xlsx': {'category': 'ewh', 'series_name': 'Electric Water Heater', 'series_model': 'UNP-INE'},
    '集热器系列.xlsx': {'category': 'collector', 'series_name': 'Solar Collector', 'series_model': 'UNP-FP01'},
}
SERIES_DESC = {k:v for k,v in zip(
    ['acdc','pvswh','s02','heatpump','ewh','collector'],
    ['Solar-powered hybrid air conditioners','Pressurized solar water heaters',
     'Non-pressurized solar water heaters','All-in-one heat pump water heaters',
     'Electric water heaters','Solar thermal collectors']
)}

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
data_dir = os.path.join(project_root, 'data')

def is_price_value(s):
    s=s.replace('USD','').replace('$','').replace(',','').replace('CNY','').strip()
    if not s: return False
    try: float(s); return True
    except ValueError: return False

def clean_price(s):
    if s.upper().startswith('CNY'): return None
    s=s.replace('USD','').replace('$','').replace(',','').strip()
    try: return f"${float(s):.2f}"
    except ValueError: return None

def is_price_header(t):
    return any(k in t.lower() for k in ['exw factory','exw in usd','exw in rmb','fob shanghai','出厂价'])

def get_model_columns(df, model_row):
    """Find columns with actual model names (not label columns)."""
    cols = []
    for ci in range(len(df.columns)):
        v = df.iloc[model_row, ci]
        if pd.isna(v): continue
        txt = str(v).strip()
        if not txt or 'model' in txt.lower(): continue
        if len(txt) > 80: continue
        cols.append(ci)
    return cols

def get_spec_name(df, row_idx, model_cols):
    """Extract spec name from non-model columns. Join multi-level headers."""
    parts = []
    for ci in range(len(df.columns)):
        if ci in model_cols: continue
        v = df.iloc[row_idx, ci]
        if pd.notna(v):
            txt = str(v).strip()
            if txt and len(txt) < 60:
                parts.append(txt)
    return ' | '.join(parts) if parts else None

def extract_specs(df, model_row, model_cols, price_rows):
    """Extract all spec rows and return {model_name: {spec_name: value}}."""
    price_indices = {pr for pr,_ in price_rows}
    skip_keywords = ['model','loading qty','tank','inner diameter','outer diameter',
        'photos','pcs','collector type','characteristic','warranty',
        'installation','packing','inner tank','outer tank','insulation',
        'thickness','density','dimension','packing']
    
    all_specs = defaultdict(dict)
    model_names = [str(df.iloc[model_row, ci]).strip() for ci in model_cols]
    
    for idx in range(model_row + 1, len(df)):
        if idx in price_indices: continue
        vals_at_model = [v for ci in model_cols if pd.notna(v:=df.iloc[idx, ci])]
        if len(vals_at_model) < 1: continue
        
        spec_name = get_spec_name(df, idx, model_cols)
        if not spec_name: continue
        if any(k in spec_name.lower() for k in skip_keywords): continue
        if 'exw' in spec_name.lower() or 'fob' in spec_name.lower() or '出厂价' in spec_name: continue
        if 'rmb' in spec_name.lower() or '人民币' in spec_name: continue
        
        for i, mc in enumerate(model_cols):
            v = df.iloc[idx, mc]
            if pd.isna(v): continue
            val = str(v).strip()
            if val and i < len(model_names):
                mn = model_names[i]
                if spec_name not in all_specs[mn]:
                    all_specs[mn][spec_name] = val
    
    return dict(all_specs)

all_series = []
for file_name, meta in FILE_MAPPING.items():
    file_path = os.path.join(data_dir, file_name)
    if not os.path.exists(file_path):
        print(f"[SKIP] {file_name}"); continue
    print(f"[READ] {file_name} ...")
    sheet_variants = []
    
    try:
        xls = pd.ExcelFile(file_path)
        for sheet in xls.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            sv = []
            
            # Strategy 1: Column-based (model+price same header row)
            hi = None
            for idx, row in df.iterrows():
                mc = pc = None
                for ci, val in enumerate(row):
                    if pd.isna(val): continue
                    tx = str(val).strip().lower()
                    if mc is None and 'model' in tx: mc = ci
                    if pc is None and any(h in tx for h in ['exw factory','fob shanghai']): pc = ci
                    if mc is not None and pc is not None: hi = (idx, mc, pc); break
                if hi: break
            
            if hi:
                hdr, mc, pc = hi
                model_cols = [mc]
                price_rows = [(pc, "")]
                specs = extract_specs(df, hdr, model_cols, price_rows)
                for di in range(hdr+1, len(df)):
                    mv, pv = df.iloc[di, mc], df.iloc[di, pc]
                    if pd.isna(mv) or pd.isna(pv): continue
                    ms, ps = str(mv).strip(), str(pv).strip()
                    if not ms or not ps: continue
                    if 'model' in ms.lower() or any(k in ms.lower() for k in ['btu','capacity','type','cop','moq']): continue
                    cp = clean_price(ps)
                    if cp is None: continue
                    sfx = ms.split('-')[-1] if '-' in ms else ms
                    sv.append({"name": sfx, "model": ms, "price": cp, 
                               "tags": ["Factory EXW"], "specs": specs.get(ms, {})})
            
            # Strategy 2: Zip-based
            if not sv:
                model_row = None
                for idx, row in df.iterrows():
                    txt = ' '.join([str(v).strip().lower() for v in row if pd.notna(v)])
                    if 'model' in txt: model_row = idx; break
                
                if model_row is not None:
                    model_cols = get_model_columns(df, model_row)
                    price_rows = []
                    spec_kw = ['loading qty','tank','inner diam','outer diam','insulation',
                        'thickness','photos','pcs','collector type','overall area','absorber area',
                        'daily output','quanties','characteristic','rated voltage','output power',
                        'short circuit','open circuit','maximum power','module efficiency',
                        'max pressure','test pressure','inner tank','outer tank','capacity']
                    ph = ['出厂价','exw factory','fob shanghai']
                    for ridx, row in df.iterrows():
                        vals = [str(v).strip() for v in row if pd.notna(v)]
                        if not vals: continue
                        f = vals[0].lower()
                        if any(k in f for k in spec_kw): continue
                        if 'rmb' in f: continue
                        has_ph = any(h in f for h in ph)
                        has_usd = any(v.startswith('USD') or v.startswith('$') for v in vals)
                        nums = [v for v in vals if is_price_value(v)]
                        if has_ph and len(nums) >= 1:
                            cond = ""
                            m=re.search(r'[（\(]([^)）]+)[\)）]',vals[0])
                            if m: cond=m.group(1).strip()
                            else:
                                wk=re.sub(r'(No VAT|No\s*Tax|EXW\s*In\s*USD|EXW\s*In\s*RMB)','',vals[0],flags=re.I)
                                m2=re.search(r'[-–]([A-Za-z]+)\s*$',wk)
                                if m2: cond=m2.group(1).strip()
                            price_rows.append((ridx, cond))
                        elif has_usd and len(nums) >= 2:
                            price_rows.append((ridx, ""))
                    
                    specs = extract_specs(df, model_row, model_cols, price_rows)
                    model_names = [str(df.iloc[model_row, ci]).strip() for ci in model_cols]
                    
                    for pr_idx, condition in price_rows:
                        pvals = [str(v).strip() for v in df.iloc[pr_idx] if pd.notna(v)]
                        skip = 1 if pvals and is_price_header(pvals[0].lower()) else 0
                        for i, mn in enumerate(model_names):
                            pi = i + skip
                            if pi >= len(pvals): continue
                            p = pvals[pi]
                            if not p or is_price_header(p.lower()): continue
                            cp = clean_price(p)
                            if cp is None: continue
                            sfx = mn.split('-')[-1] if '-' in mn else mn
                            if condition: sfx = f"{sfx} ({condition})"
                            sv.append({"name": sfx, "model": mn, "price": cp,
                                       "tags": ["Factory EXW"], "specs": specs.get(mn, {})})
            
            print(f"  {sheet:30s} {len(sv):3d} variants ({'Y' if any(v.get('specs') for v in sv) else 'N'} specs)")
            sheet_variants.extend(sv)
    except Exception as e:
        print(f"[ERROR] {file_name}: {e}")
    
    if sheet_variants:
        prices = [float(v['price'].replace('$','')) for v in sheet_variants if v['price'].startswith('$')]
        mp = min(prices) if prices else 0; xp = max(prices) if prices else 0
        all_series.append({
            "category": meta['category'], "series": meta['series_model'],
            "seriesName": meta['series_name'],
            "description": SERIES_DESC.get(meta['category'], ''),
            "priceRange": f"${mp:.2f}" if mp == xp else f"${mp:.2f} ~ ${xp:.2f}",
            "tags": ["Factory EXW"], "variants": sheet_variants,
        })

json.dump(all_series, open(os.path.join(project_root, 'frontend','app','uniepu','data','catalog-products.json'),'w'), indent=2, ensure_ascii=False)
json.dump(all_series, open(os.path.join(project_root, 'uniepu_product_knowledge.json'),'w'), indent=2, ensure_ascii=False)
total = sum(len(s['variants']) for s in all_series)
spec_count = sum(1 for s in all_series for v in s['variants'] if v.get('specs'))
print(f"\n[OK] {len(all_series)} series, {total} variants ({spec_count} with specs)")
