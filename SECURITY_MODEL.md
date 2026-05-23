# CogniHaven Security Architecture & Threat Model

CogniHaven employs a **Multi-Layered Adaptive Defense** system. This document outlines every mechanism used to flag suspicious activity, trigger Step-Up Authentication (OTP), or initiate a Session Freeze (Blocked).

---

## 1. Behavioral Biometrics (Layer 1: Continuous)
The "Invisible SDK" captures interaction dynamics every 3 seconds. These are processed using **Personalized Delta Profiling (Z-Scores)** against an **Isolation Forest** model.

### **Flagging Criteria:**
*   **Low Variance (Bot Detection):** If typing or mouse movements are "too perfect" (variance near zero), the system flags a robotic process.
*   **Extreme Variance (Hacker Detection):** If interaction is erratic, hesitant, or violent (e.g., mouse shaking), it indicates an impostor.
*   **Personal Deviation (Z-Magnitude):** If the user's current behavior deviates from their established baseline (Calibration Phase) by more than **2 standard deviations**, the risk score is amplified.

---

## 2. Pre-Login Security (Layer 2: Gateway)
Protection begins before the user enters the dashboard.

### **Flagging Criteria:**
*   **Credential Consistency:** Monitors the rhythm of typing the username/password.
*   **Cold-Start Profiling:** New users are immediately funneled into a **Calibration Phase** ("The Quick Brown Fox") to establish a behavioral fingerprint.
*   **Failed Session Linkage:** Any attempt to stream telemetry without a valid backend-issued `session_id` results in an instant **401 Unauthorized** and tracking termination.

---

## 3. Post-Login "Telemetry Traps" (Layer 3: Contextual)
The web portal contains specific triggers based on financial and account takeover (ATO) patterns.

### **OTP Triggers (Step-Up Authentication):**
*   **The "Big Ticket" Rule:** Any Fund Transfer **> $10,000** or Loan Application **> $20,000**.
*   **The "Smashed & Grabbed" Rule:** Attempting to change a password within **60 seconds** of login.
*   **The "High Risk Sweep":** Any single movement with an average velocity **> 3.0 px/ms**.

### **Block Triggers (Session Freeze):**
*   **The "Rapid-Fire" Rule:** Attempting **2 or more** high-value actions (transfers/loans) within a single 3-second heartbeat.
*   **The "Identity Wipe" Rule:** Simultaneously updating both **Email AND Phone Number** in a single profile update.
*   **The "Violent Deviation" Rule:** Any behavioral variance score **> 20.0** (e.g., shaking the mouse violently to bypass UI).

---

## 4. SOC Admin Intelligence
The **Security Operations Center (SOC)** provides real-time visibility into these flags.

*   **Threat Feed:** Exclusively shows flagged events (OTP/Blocked) for rapid neutralization.
*   **User Registry:** Full behavioral audit logs for every registered identity.
*   **Kill Switch:** Admins can manually **Reset Biometrics**, forcing a re-calibration if a profile is suspected to be "polluted" by a hacker.

---

## 5. Risk Scoring Summary
| Risk Score | Status | Action Taken |
| :--- | :--- | :--- |
| **0 - 30** | **Safe** | Transparent background monitoring. |
| **31 - 65** | **Warning** | **OTP Modal** triggered; user must verify identity. |
| **66 - 100** | **Critical** | **Session Frozen**; UI locked; Admin notified. |
