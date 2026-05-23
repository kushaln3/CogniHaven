import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

# --- 1. Synthetic Data Generation ---

def generate_data(n_normal=15000, n_anomaly=1500):
    np.random.seed(42)
    
    cols = [
        'dwell_mean', 'dwell_variance', 
        'flight_mean', 'flight_variance', 
        'mouse_velocity_mean', 'mouse_velocity_variance'
    ]
    
    # --- BROAD NORMAL USER DATA ---
    # Human behavior is extremely noisy. We need to widen these distributions.
    
    # Mode A: Active/Snappy (Typical use)
    mode_a = pd.DataFrame({
        'dwell_mean': np.random.normal(120, 30, n_normal // 4),
        'dwell_variance': np.random.normal(100, 50, n_normal // 4),
        'flight_mean': np.random.normal(180, 80, n_normal // 4),
        'flight_variance': np.random.normal(5000, 2000, n_normal // 4),
        'mouse_velocity_mean': np.random.normal(1.0, 0.5, n_normal // 4),
        'mouse_velocity_variance': np.random.normal(1.0, 0.5, n_normal // 4)
    })
    
    # Mode B: Slow/Laggy (User thinking, slow typing, long mouse moves)
    # This addresses the "Flight Variance" issue you saw (e.g., 170,000)
    mode_b = pd.DataFrame({
        'dwell_mean': np.random.normal(180, 60, n_normal // 4),
        'dwell_variance': np.random.normal(500, 200, n_normal // 4),
        'flight_mean': np.random.normal(500, 200, n_normal // 4),
        'flight_variance': np.random.uniform(10000, 200000, n_normal // 4), # Allow HUGE variance
        'mouse_velocity_mean': np.random.normal(0.5, 0.4, n_normal // 4),
        'mouse_velocity_variance': np.random.normal(0.3, 0.2, n_normal // 4)
    })
    
    # Mode C: Idle Mouse (Typing only)
    mode_c = pd.DataFrame({
        'dwell_mean': np.random.normal(130, 40, n_normal // 4),
        'dwell_variance': np.random.normal(100, 80, n_normal // 4),
        'flight_mean': np.random.normal(250, 100, n_normal // 4),
        'flight_variance': np.random.normal(10000, 5000, n_normal // 4),
        'mouse_velocity_mean': [0.0] * (n_normal // 4),
        'mouse_velocity_variance': [0.0] * (n_normal // 4)
    })
    
    # Mode D: Idle Keyboard (Browsing only)
    mode_d = pd.DataFrame({
        'dwell_mean': [0.0] * (n_normal // 4),
        'dwell_variance': [0.0] * (n_normal // 4),
        'flight_mean': [0.0] * (n_normal // 4),
        'flight_variance': [0.0] * (n_normal // 4),
        'mouse_velocity_mean': np.random.normal(1.2, 0.8, n_normal // 4),
        'mouse_velocity_variance': np.random.normal(2.0, 1.5, n_normal // 4)
    })
    
    normal_data = pd.concat([mode_a, mode_b, mode_c, mode_d])
    
    for col in cols:
        normal_data[col] = normal_data[col].clip(lower=0)

    # --- ANOMALY DATA (TRULY EXTREME) ---
    
    # Bot: Zero variance on high activity (Impossible for humans)
    bots = pd.DataFrame({
        'dwell_mean': [100.0] * (n_anomaly // 2),
        'dwell_variance': [0.0] * (n_anomaly // 2),
        'flight_mean': [100.0] * (n_anomaly // 2),
        'flight_variance': [0.0] * (n_anomaly // 2),
        'mouse_velocity_mean': [5.0] * (n_anomaly // 2),
        'mouse_velocity_variance': [0.0] * (n_anomaly // 2)
    })
    
    # Hacker: Extreme Shaking / Violent movements
    hackers = pd.DataFrame({
        'dwell_mean': np.random.normal(500, 100, n_anomaly // 2),
        'dwell_variance': np.random.normal(5000, 1000, n_anomaly // 2),
        'flight_mean': np.random.normal(2000, 500, n_anomaly // 2),
        'flight_variance': np.random.normal(500000, 100000, n_anomaly // 2),
        'mouse_velocity_mean': np.random.normal(15.0, 5.0, n_anomaly // 2), # Extreme speed
        'mouse_velocity_variance': np.random.normal(300.0, 100.0, n_anomaly // 2) # Extreme shaking
    })

    anomalies = pd.concat([bots, hackers])
    for col in cols:
        anomalies[col] = anomalies[col].clip(lower=0)
    
    normal_data['target'] = 1
    anomalies['target'] = -1
    
    df = pd.concat([normal_data, anomalies]).reset_index(drop=True)
    return df

# --- 2. Model Training ---

print("Generating ultra-broad synthetic behavioral data...")
data = generate_data()
X = data.drop('target', axis=1)
y_true = data['target']

print("Training Isolation Forest (High Robustness)...")
# Decreased contamination to 0.05 to be more permissive of "weird" humans
model = IsolationForest(n_estimators=300, contamination=0.05, random_state=42)
model.fit(X)

# --- 3. Validation & Export ---

y_pred = model.predict(X)
total_anomalies = (y_true == -1).sum()
detected_anomalies = ((y_true == -1) & (y_pred == -1)).sum()
print(f"Detection Accuracy on Anomalies: {(detected_anomalies/total_anomalies)*100:.2f}%")

joblib.dump(model, 'isolation_forest.pkl')
print("\nModel updated and exported.")

# Test "Noisy Human" (Previous failure cases)
noisy_human = pd.DataFrame([[150.0, 1000.0, 500.0, 150000.0, 1.5, 2.0]], columns=X.columns)
score = model.decision_function(noisy_human)[0]
print(f"Noisy Human Decision Score: {score:.4f} (Target > 0)")
print(f"Prediction: {'NORMAL' if model.predict(noisy_human)[0] == 1 else 'ANOMALY'}")
