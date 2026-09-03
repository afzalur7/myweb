"""
====================================================================
 Insurtech & Digital Risk Solutions — Integrated Synthetic Dataset
 Generator
====================================================================
Creates the six CSV tables used throughout the course:
  customers.csv, policies.csv, claims.csv,
  fraud_indicators.csv, cyber_incidents.csv, weather_data.csv

The seed is fixed at 42 so every run produces the IDENTICAL dataset.

USAGE:
  Run from the folder containing this script (or set your working
  directory there), then:
      python generate_dataset.py

  The six CSVs are written to the same folder (data/).

REQUIREMENTS:
  Python 3.7+ with pandas and numpy installed.
  (pip install pandas numpy)

NOTE:
  Run this ONCE. Do not regenerate mid-course — the keys must stay
  consistent with the exercises students have already completed.
====================================================================
"""

import os
import numpy as np
import pandas as pd

# Fix the seed so every student generates the IDENTICAL dataset
np.random.seed(42)

# Where to write the CSVs — same folder as this script
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------
# 1. CUSTOMER TABLE — 5,000 customers
# ---------------------------------------------------------------
n_cust = 5000
customer_id = np.arange(1, n_cust + 1)
age         = np.random.randint(18, 75, n_cust)
gender      = np.random.choice(['Male', 'Female'], n_cust, p=[0.52, 0.48])
location    = np.random.choice(['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad',
                                'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'], n_cust)
occupation  = np.random.choice(['Salaried', 'Self-Employed', 'Business', 'Farmer', 'Retired'], n_cust)
income      = np.random.lognormal(mean=11.8, sigma=0.6, size=n_cust).round(0)
# Income missing for some older customers (MAR — missing depends on age)
# (kept as float so NaN is allowed)
income[np.random.rand(n_cust) < 0.05] = np.nan
credit_score = np.clip(np.random.normal(710, 85, n_cust), 400, 900).astype(int)
kyc_status  = np.random.choice(['Verified', 'Pending', 'Not Started'], n_cust, p=[0.85, 0.10, 0.05])

customers = pd.DataFrame({
    'customer_id': customer_id, 'age': age, 'gender': gender,
    'location': location, 'occupation': occupation, 'income': income,
    'credit_score': credit_score, 'kyc_status': kyc_status
})
customers.to_csv(os.path.join(OUT_DIR, 'customers.csv'), index=False)

# ---------------------------------------------------------------
# 2. POLICY TABLE — 10,000 policies (some customers hold multiple)
# ---------------------------------------------------------------
n_pol = 10000
policy_id   = np.arange(1, n_pol + 1)
pol_cust_id = np.random.choice(customer_id, n_pol, replace=True)
policy_type = np.random.choice(['Motor', 'Health', 'Property', 'Crop', 'Travel'], n_pol,
                               p=[0.40, 0.30, 0.12, 0.10, 0.08])
premium     = np.round(np.random.lognormal(mean=8.9, sigma=0.5, size=n_pol), 0)
sum_assured = np.round(np.random.lognormal(mean=15.5, sigma=0.9, size=n_pol), 0).astype(int)
tenure_months = np.random.randint(1, 60, n_pol)
start_date  = pd.to_datetime('2023-01-01') + pd.to_timedelta(np.random.randint(0, 1000, n_pol), unit='D')
end_date    = start_date + pd.to_timedelta(tenure_months * 30, unit='D')
channel     = np.random.choice(['Online', 'Agent', 'Aggregator', 'Bancassurance', 'Partnership'], n_pol,
                               p=[0.30, 0.30, 0.20, 0.12, 0.08])
product_name = 'Pol-' + policy_type

policies = pd.DataFrame({
    'policy_id': policy_id, 'customer_id': pol_cust_id, 'policy_type': policy_type,
    'premium': premium, 'sum_assured': sum_assured, 'tenure_months': tenure_months,
    'start_date': start_date, 'end_date': end_date, 'channel': channel,
    'product_name': product_name
})
policies.to_csv(os.path.join(OUT_DIR, 'policies.csv'), index=False)

# ---------------------------------------------------------------
# 3. CLAIMS TABLE — 20,000 claims
# ---------------------------------------------------------------
n_clm = 20000
pol_ids      = np.random.choice(policy_id, n_clm, replace=True)
claim_id     = np.arange(1, n_clm + 1)
claim_type   = np.random.choice(['Accident', 'Theft', 'Fire', 'Natural Disaster', 'Health'], n_clm,
                                p=[0.35, 0.15, 0.10, 0.15, 0.25])
claim_amount = np.round(np.random.lognormal(mean=10.8, sigma=1.0, size=n_clm), 0).astype(int)
settlement   = np.round(claim_amount * np.random.uniform(0.85, 1.05, n_clm), 0)
status       = np.random.choice(['Settled', 'Pending', 'Rejected'], n_clm, p=[0.78, 0.15, 0.07])
claim_date   = pd.to_datetime('2024-01-01') + pd.to_timedelta(np.random.randint(0, 900, n_clm), unit='D')
days_to_settle = np.where(status == 'Settled', np.random.randint(3, 120, n_clm), np.nan)
fraud_flag   = (np.random.rand(n_clm) < 0.05).astype(int)

# Derive customer_id for each claim from its policy (consistent keys)
claim_cust_id = policies.set_index('policy_id')['customer_id'].reindex(pol_ids).values

claims = pd.DataFrame({
    'claim_id': claim_id, 'policy_id': pol_ids, 'customer_id': claim_cust_id,
    'claim_date': claim_date, 'claim_type': claim_type,
    'claim_amount': claim_amount, 'settlement_amount': settlement,
    'status': status, 'fraud_flag': fraud_flag, 'days_to_settle': days_to_settle
})
claims.to_csv(os.path.join(OUT_DIR, 'claims.csv'), index=False)

# ---------------------------------------------------------------
# 4. FRAUD INDICATORS TABLE — 5,000 indicators linked to claims
# ---------------------------------------------------------------
n_ind = 5000
indicator_id   = np.arange(1, n_ind + 1)
indicator_claim = np.random.choice(claim_id, n_ind, replace=True)
indicator_type = np.random.choice(['Rapid Settlement', 'High Claim Ratio', 'Policy-Claim Gap',
                                   'Repeat Claimant', 'Amount Rounding'], n_ind)
indicator_value = np.random.choice([0, 1], n_ind, p=[0.4, 0.6])
score           = np.round(np.random.uniform(0, 100, n_ind), 1)
review_status   = np.random.choice(['Flagged', 'Under Review', 'Confirmed', 'Cleared'], n_ind,
                                   p=[0.4, 0.3, 0.2, 0.1])

fraud_indicators = pd.DataFrame({
    'indicator_id': indicator_id, 'claim_id': indicator_claim,
    'indicator_type': indicator_type, 'indicator_value': indicator_value,
    'score': score, 'review_status': review_status
})
fraud_indicators.to_csv(os.path.join(OUT_DIR, 'fraud_indicators.csv'), index=False)

# ---------------------------------------------------------------
# 5. CYBER INCIDENT TABLE — 2,000 incidents
# ---------------------------------------------------------------
n_cyb = 2000
incident_id = np.arange(1, n_cyb + 1)
industry    = np.random.choice(['BFSI', 'Healthcare', 'IT/ITeS', 'Manufacturing', 'Retail', 'Government'], n_cyb)
breach_type = np.random.choice(['Ransomware', 'Data Breach', 'BEC', 'DDoS', 'Insider Threat'], n_cyb,
                               p=[0.35, 0.30, 0.15, 0.10, 0.10])
records_exposed = np.random.choice([0, 1000, 10000, 100000, 1000000], n_cyb,
                                   p=[0.2, 0.3, 0.3, 0.15, 0.05])
loss_amount_cr = np.round(np.random.lognormal(mean=1.2, sigma=1.3, size=n_cyb), 2)
ransomware_flag = np.where(breach_type == 'Ransomware', 1, 0).astype(int)

cyber = pd.DataFrame({
    'incident_id': incident_id, 'industry': industry, 'breach_type': breach_type,
    'records_exposed': records_exposed, 'loss_amount_cr': loss_amount_cr,
    'ransomware_flag': ransomware_flag
})
cyber.to_csv(os.path.join(OUT_DIR, 'cyber_incidents.csv'), index=False)

# ---------------------------------------------------------------
# 6. WEATHER / CLIMATE TABLE — 3,000 daily records across regions
# ---------------------------------------------------------------
regions = ['Coastal', 'Inland', 'Mountain', 'Urban']
n_weather = 3000
w_date   = pd.to_datetime('2020-01-01') + pd.to_timedelta(np.random.randint(0, 2000, n_weather), unit='D')
w_region = np.random.choice(regions, n_weather)
rainfall_mm = np.round(np.random.lognormal(mean=1.5, sigma=1.2, size=n_weather), 1)
max_temp    = np.round(np.random.uniform(20, 42, n_weather), 1)
min_temp    = max_temp - np.round(np.random.uniform(6, 12, n_weather), 1)
cyclone_event = (np.random.rand(n_weather) < 0.02).astype(int)
wind_speed_kmph = np.where(cyclone_event == 1,
                           np.random.uniform(80, 260, n_weather),
                           np.random.uniform(5, 40, n_weather)).round(1)
flood_index  = np.round(np.random.uniform(0, 1, n_weather), 2)

weather = pd.DataFrame({
    'date': w_date, 'region': w_region, 'rainfall_mm': rainfall_mm,
    'max_temp': max_temp, 'min_temp': min_temp, 'cyclone_event': cyclone_event,
    'wind_speed_kmph': wind_speed_kmph, 'flood_index': flood_index
})
weather.to_csv(os.path.join(OUT_DIR, 'weather_data.csv'), index=False)

# ---------------------------------------------------------------
# Confirm all six files were created
# ---------------------------------------------------------------
print('Generated files in:', OUT_DIR)
for f in ['customers.csv', 'policies.csv', 'claims.csv',
          'fraud_indicators.csv', 'cyber_incidents.csv', 'weather_data.csv']:
    path = os.path.join(OUT_DIR, f)
    print(f'  {f:24s} {os.path.getsize(path):>7,} bytes')
print('Done.')
