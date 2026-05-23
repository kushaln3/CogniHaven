# CogniHaven V2.2: Final Acceptance Test Protocol

This procedure ensures that all biometric sensors, ML intelligence, and infrastructure defenses are operating at production-grade reliability.

---

## 🏗️ Environment Ready-Check
1.  **Infrastructure:** Ensure Redis is running (`docker-compose ps`).
2.  **Backend:** Start FastAPI (`python main.py`). Verify log: `STATUS: Redis connected successfully`.
3.  **Frontend:** Start Vite (`npm run dev`).
4.  **SOC:** Open a separate browser tab to `http://localhost:5173/admin` (admin/admin).

---

## 🧪 Test Stage 1: The "Human Baseline" (Positive Path)
**Goal:** Verify that a legitimate user can enroll and navigate without false positives.

1.  **Provision:** From the SOC Dashboard, create a new user: `human_01`.
2.  **Enroll:** Log in as `human_01`. Type the "Quick Brown Fox" phrase at your **natural, steady pace**.
3.  **Verify Profile:** In the SOC Dashboard -> User Registry, verify `human_01` is classified correctly (e.g., `Profile: Medium`).
4.  **Baseline Navigation:** Navigate the portal (View Statement, Transfer $500).
5.  **Expected Result:** Risk Score stays **< 30**. Status remains **Safe**. No UI interruptions.

---

## 🧪 Test Stage 2: The "Impostor" (Behavioral Anomaly)
**Goal:** Verify that deviation from a personal profile triggers a warning.

1.  **Identity Swap:** While logged in as `human_01`, suddenly change your behavior:
    *   **Action:** Type with massive, hesitant pauses between keys.
    *   **Action:** Shake your mouse violently while clicking "Update Profile".
2.  **Observe Response:**
    *   **UI:** The **OTP Modal** should appear (Risk > 30).
    *   **SOC:** The log should show `Anomalous Flight Deviation` or `Anomalous Velocity Deviation`.
3.  **Recovery:** Enter any code into the OTP modal.
4.  **Expected Result:** Access restored; Risk Score temporarily drops.

---

## 🧪 Test Stage 3: The "Telemetry Traps" (Contextual Anomaly)
**Goal:** Verify that event-based rules trigger instantly regardless of behavior.

1.  **High-Value Transfer:** Navigate to Fund Transfer. Transfer **$15,000**.
    *   **Expected:** Instant **OTP Modal**. SOC Log: `[execute_fund_transfer (High-Value Transfer ($15000.0))]`.
2.  **Identity Wipe:** Navigate to Update Profile. Click "Save Changes".
    *   **Expected:** Instant **Session Frozen** (Red Screen). SOC Log: `[execute_profile_update (Identity Wipe Attempt)]`.

---

## 🧪 Test Stage 4: The "Brute Force Bot" (Infrastructure Defense)
**Goal:** Verify Layer 1 Rate Limiting via Redis.

1.  **Attack:** Rapidly click the "Sign In" button or refresh the page 30+ times within one minute.
2.  **Expected Result:** The browser should receive an **HTTP 429 Too Many Requests**. The backend terminal will show `Layer 1 Block`.

---

## 🧪 Test Stage 5: The "Admin Lifecycle" (Resilience)
**Goal:** Verify state management and cleanup.

1.  **State Persistence:** Trigger an OTP challenge, then **Refresh the Page (F5)**.
    *   **Expected:** The OTP modal **persists** (pulled from Redis cache).
2.  **Biometric Reset:** In the SOC, click **"Reset Biometrics"** for `human_01`.
    *   **Expected:** Log back in as `human_01`. The system must force the **Quick Brown Fox calibration** again.
3.  **System Purge:** In the SOC, click **"Purge Identity"** for `human_01`.
    *   **Expected:** User is deleted. Logs for `human_01` are wiped. Dashboard is clean.

---

## ✅ Success Criteria for Demo
- [ ] Z-Scores correctly identify speed deviations.
- [ ] ML Brain identifies "un-human" jitter patterns.
- [ ] Contextual metadata (Amounts) triggers OTP.
- [ ] SOC Logs provide clear **Justifications**.
- [ ] Redis maintains security state across refreshes.
