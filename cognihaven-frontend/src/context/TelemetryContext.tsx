import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { extractRawMetrics, type KeystrokeRawEvent, type MouseRawEvent } from '../utils/telemetry';
import { TelemetryContext } from './TelemetryContextInstance';

export interface TelemetryContextType {
  sessionId: string;
  setSessionId: (id: string, isEnrolled?: boolean) => void;
  riskScore: number;
  isFrozen: boolean;
  needsOtp: boolean;
  otpReason: 'learning' | 'risk' | null;
  setRiskScore: (score: number) => void;
  resetOtp: () => void;
  verifyOtp: (otp: string) => Promise<boolean>;
  enrollSession: () => Promise<void>;
  isCalibrated: boolean;
  setIsCalibrated: (val: boolean) => void;
  setAction: (action: string, metadata?: Record<string, unknown>) => void;
  logout: () => void;
  username: string | null;
  setUsername: (name: string | null) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionIdState] = useState(uuidv4());
  const [username, setUsername] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otpReason, setOtpReason] = useState<'learning' | 'risk' | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState<string | null>(null);

  const keystrokesRef = useRef<KeystrokeRawEvent[]>([]);
  const mouseMovementsRef = useRef<MouseRawEvent[]>([]);
  const lastBatchTimeRef = useRef<number>(0);
  const currentActionRef = useRef<string>("session_sync");
  const actionMetadataRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    lastBatchTimeRef.current = Date.now();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const setSessionId = (id: string, isEnrolled?: boolean) => {
    setSessionIdState(id);
    if (isEnrolled !== undefined) {
      setIsCalibrated(isEnrolled);
    }
  };


  const setAction = (action: string, metadata?: Record<string, unknown>) => {
    // Prevent setting new actions if security challenges are active or session is blocked
    if (isFrozen || needsOtp) return;
    currentActionRef.current = action;
    actionMetadataRef.current = metadata || null;

    // If it's a fund transfer, we set a pending message to be shown LATER if OTP is triggered
    if (action === "execute_fund_transfer" && metadata) {
      setPendingSuccessMessage(`Transfer of ₹${metadata.amount} to ${metadata.recipient} initiated.`);
    }
  };

  const logout = () => {
    setSessionId(uuidv4());
    setUsername(null);
    setRiskScore(0);
    setIsFrozen(false);
    setNeedsOtp(false);
    setOtpReason(null);
    setIsCalibrated(false);
    keystrokesRef.current = [];
    mouseMovementsRef.current = [];
    actionMetadataRef.current = null;
    setPendingSuccessMessage(null);
  };

  const enrollSession = async () => {
    const now = Date.now();
    const batch = {
      ...extractRawMetrics(
        keystrokesRef.current,
        mouseMovementsRef.current,
        sessionId,
        lastBatchTimeRef.current,
        now
      ),
      action: "calibration_enrollment",
      metadata: null
    };

    try {
      const response = await fetch('http://localhost:8000/enroll-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        setIsCalibrated(true);
        // Reset buffers after enrollment
        keystrokesRef.current = [];
        lastBatchTimeRef.current = now;
      }
    } catch (error) {
      console.error('Enrollment failed:', error);
    }
  };

  const verifyOtp = async (otp: string) => {
    try {
      const response = await fetch('http://localhost:8000/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, otp }),
      });

      if (response.ok) {
        setNeedsOtp(false);
        setOtpReason(null);
        setRiskScore(0);
        
        // NOW we show the success message
        if (pendingSuccessMessage) {
          showNotification(pendingSuccessMessage, 'success');
          setPendingSuccessMessage(null);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('OTP verification failed:', error);
      return false;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      keystrokesRef.current.push({
        key: e.key,
        keydownTimestamp: Date.now(),
      });
    };

    const handleKeyUp = (e: globalThis.KeyboardEvent) => {
      const lastKey = [...keystrokesRef.current].reverse().find(k => k.key === e.key && k.keyupTimestamp === undefined);
      if (lastKey) {
        lastKey.keyupTimestamp = Date.now();
      }
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      mouseMovementsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      });

      if (mouseMovementsRef.current.length > 500) {
        mouseMovementsRef.current.shift();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    // Only start continuous streaming AFTER calibration
    const interval = setInterval(async () => {
      if (!isCalibrated || isFrozen) return;

      const now = Date.now();
      const batch = {
        ...extractRawMetrics(
          keystrokesRef.current,
          mouseMovementsRef.current,
          sessionId,
          lastBatchTimeRef.current,
          now
        ),
        action: currentActionRef.current,
        metadata: actionMetadataRef.current
      };

      // Reset action and metadata after sending
      currentActionRef.current = "session_sync";
      actionMetadataRef.current = null;

      // Reset buffers
      keystrokesRef.current = [];
      if (mouseMovementsRef.current.length > 0) {
        const lastMove = mouseMovementsRef.current[mouseMovementsRef.current.length - 1];
        mouseMovementsRef.current = [lastMove];
      }
      lastBatchTimeRef.current = now;

      if (batch.keystrokes.length > 0 || batch.mouse_movements.length > 0 || batch.action !== "session_sync") {
        try {
          const response = await fetch('http://localhost:8000/telemetry-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
          });

          if (response.ok) {
            const data = await response.json();
            setRiskScore(data.risk_score);
            
            // SYNCHRONIZE WITH BACKEND STATUS
            if (data.status === 'blocked') {
              setIsFrozen(true);
            } else if (data.status === 'otp_triggered') {
              setNeedsOtp(true);
              setOtpReason(data.otp_reason);
            } else if (data.status === 'allowed' && batch.action !== "session_sync") {
              // If allowed immediately, show message now
              if (pendingSuccessMessage) {
                showNotification(pendingSuccessMessage, 'success');
                setPendingSuccessMessage(null);
              }
            }
          }
        } catch (error) {
          console.error('Failed to stream telemetry:', error);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [sessionId, isCalibrated, isFrozen, needsOtp, pendingSuccessMessage]);

  const resetOtp = () => {
    setNeedsOtp(false);
    setOtpReason(null);
  };

  return (
    <TelemetryContext.Provider value={{ 
      sessionId, setSessionId, riskScore, isFrozen, needsOtp, otpReason, setRiskScore, resetOtp, verifyOtp, enrollSession, isCalibrated, setIsCalibrated, setAction, logout, username, setUsername, showNotification
    }}>
      {children}
      
      {/* GLOBAL NOTIFICATION SYSTEM */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[1000] p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 flex items-center ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-3 animate-pulse ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          <span className="text-xs font-bold uppercase tracking-wider font-mono">{notification.message}</span>
        </div>
      )}
    </TelemetryContext.Provider>
  );
};
