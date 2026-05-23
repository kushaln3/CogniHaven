# CogniHaven: Continuous Behavioral Authentication Platform

CogniHaven is an enterprise-grade, real-time security solution designed to replace static authentication methods with **Continuous Behavioral Identity Verification**. By leveraging non-invasive telemetry and high-dimensional anomaly detection, CogniHaven establishes a persistent "Behavioral Identity Shield" that protects user accounts against automated bots, credential stuffing, and sophisticated account takeover (ATO) attacks.

---

## 🏗️ System Architecture

CogniHaven utilizes a distributed three-layer architecture to ensure low-latency monitoring and high-accuracy threat detection.

### 1. The Invisible Telemetry SDK (Frontend Layer)
Operating within a React.js framework, the SDK acts as a high-frequency, non-blocking behavioral sensor.
*   **Non-Invasive Capture:** Utilizes global event listeners to record raw keystroke dynamics (dwell and flight times) and mouse dynamics (coordinates and time deltas).
*   **Privacy-Preserving:** Masking logic ensures that specific key characters are never recorded or transmitted; only temporal rhythms are analyzed.
*   **Edge Batching:** Raw events are aggregated into 3-second windows and streamed via JSON POST requests to the API gateway, minimizing browser overhead and preserving data variance for the backend.

### 2. Hybrid Risk Engine (Backend Layer)
Built with FastAPI and SQLAlchemy, the backend serves as the centralized orchestration and feature extraction layer.
*   **Feature Extraction:** Utilizes NumPy to transform raw event arrays into a 6-feature behavioral vector:
    *   `dwell_mean` / `dwell_variance`
    *   `flight_mean` / `flight_variance`
    *   `mouse_velocity_mean` / `mouse_velocity_variance`
*   **Personalized Delta Profiling:** Implements a Z-score normalization model ($Z = \frac{X - \mu}{\sigma}$) comparing real-time interactions against a user's persistent behavioral baseline stored in SQLite.
*   **Contextual Rule Engine:** Enforces business logic "Telemetry Traps" (e.g., large transfers, rapid-fire submissions) that work in tandem with behavioral scoring.

### 3. The Anomaly Brain (ML Layer)
The intelligence core utilizes scikit-learn for high-dimensional outlier detection.
*   **Isolation Forest:** Employs an ensemble of 300 isolation trees trained on diverse behavioral modes (Active, Laggy, Idle).
*   **Explainable Intelligence:** The model generates granular justifications for every flagging event, distinguishing between biometric deviations, robotic precision, and violent erraticism.

---

## 🛡️ Security & Mitigation Matrix

| Security Layer | mechanism | Threat Target | Adaptive Response |
| :--- | :--- | :--- | :--- |
| **Biometric** | Z-Score Delta > 3.0 | Identity Theft / Impostors | OTP Challenge |
| **ML Engine** | Isolation Outlier | High-Dimensional Anomalies | Session Freeze |
| **Robotic** | Variance < 0.01 | Headless Browsers / Scripts | Instant Block |
| **Contextual** | Amount > $10,000 | High-Value Fraud | Step-Up Auth |
| **Contextual** | ATO Change Pattern | Account Takeover | Instant Block |

---

## 📊 Administrative Command Center (SOC)

The Security Operations Center (SOC) dashboard provides real-time, explainable visibility into the platform's defensive posture.

*   **Live Threat Feed:** An action-oriented stream focusing exclusively on intercepted anomalies. Each entry includes **Justification Tags** (e.g., `Anomalous Flight Deviation`) to provide transparency into the decision-making process.
*   **Behavioral Registry:** A comprehensive database of registered identities, classifying users as **Slow, Medium, or Fast** based on their established rhythm.
*   **Lifecycle Control:** Admins can provision new users, purge identities, or trigger a **Biometric Reset** to force re-calibration if an account's behavioral profile is suspected to be polluted.

---

## 🚀 Installation & Deployment

### Prerequisites
*   Python 3.13+
*   Node.js 20+
*   SQLite

### 1. Backend Service
```bash
cd cognihaven-backend
pip install -r requirements.txt
python main.py
```
*Accessible at `http://localhost:8000`*

### 2. Frontend Application
```bash
cd cognihaven-frontend
npm install
npm run dev
```
*Accessible at `http://localhost:5173`*

### 3. Training the ML Engine
```bash
cd ml_engine
python train_model.py
```

---

## 🛠️ Technical Stack
*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide.
*   **Backend:** Python 3.13, FastAPI, SQLAlchemy, Pydantic.
*   **Computing:** NumPy, Pandas.
*   **Machine Learning:** Scikit-learn (Isolation Forest), Joblib.
*   **Database:** SQLite.

---

**CogniHaven V2.2 // Continuous Security for the Modern Web**
*"Authentication is no longer a moment; it is a state."*
