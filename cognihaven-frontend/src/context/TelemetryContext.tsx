import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { extractRawMetrics, type KeystrokeRawEvent, type MouseRawEvent } from '../utils/telemetry';

interface TelemetryContextType {
  sessionId: string;
  setSessionId: (id: string, isEnrolled?: boolean) => void;
  riskScore: number;
  isFrozen: boolean;
  needsOtp: boolean;
  setRiskScore: (score: number) => void;
  resetOtp: () => void;
  enrollSession: () => Promise<void>;
  isCalibrated: boolean;
  setIsCalibrated: (val: boolean) => void;
  setAction: (action: string, metadata?: any) => void;
  logout: () => void;
  username: string | null;
  setUsername: (name: string | null) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionIdState] = useState(uuidv4());
  const [username, setUsername] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  const keystrokesRef = useRef<KeystrokeRawEvent[]>([]);
  const mouseMovementsRef = useRef<MouseRawEvent[]>([]);
  const lastBatchTimeRef = useRef<number>(Date.now());
  const currentActionRef = useRef<string>("heartbeat");
  const actionMetadataRef = useRef<any>(null);

  const setSessionId = (id: string, isEnrolled?: boolean) => {
    setSessionIdState(id);
    if (isEnrolled !== undefined) {
      setIsCalibrated(isEnrolled);
    }
  };


  const setAction = (action: string, metadata?: any) => {
    currentActionRef.current = action;
    actionMetadataRef.current = metadata || null;
  };

  const logout = () => {
    setSessionId(uuidv4());
    setUsername(null);
    setRiskScore(0);
    setIsFrozen(false);
    setNeedsOtp(false);
    setIsCalibrated(false);
    keystrokesRef.current = [];
    mouseMovementsRef.current = [];
    actionMetadataRef.current = null;
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
      if (!isCalibrated) return;

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
      currentActionRef.current = "heartbeat";
      actionMetadataRef.current = null;

      // Reset buffers
      keystrokesRef.current = [];
      if (mouseMovementsRef.current.length > 0) {
        const lastMove = mouseMovementsRef.current[mouseMovementsRef.current.length - 1];
        mouseMovementsRef.current = [lastMove];
      }
      lastBatchTimeRef.current = now;

      if (batch.keystrokes.length > 0 || batch.mouse_movements.length > 0) {
        try {
          const response = await fetch('http://localhost:8000/telemetry-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
          });

          if (response.ok) {
            const data = await response.json();
            const newScore = data.risk_score;
            setRiskScore(newScore);

            if (newScore >= 66) {
              setIsFrozen(true);
            } else if (newScore >= 31) {
              setNeedsOtp(true);
            }
          }
        } catch (error) {
          console.error('Failed to stream raw telemetry:', error);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [sessionId, isCalibrated]);

  const resetOtp = () => setNeedsOtp(false);

  return (
    <TelemetryContext.Provider value={{ 
      sessionId, setSessionId, riskScore, isFrozen, needsOtp, setRiskScore, resetOtp, enrollSession, isCalibrated, setIsCalibrated, setAction, logout, username, setUsername
    }}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('useTelemetry must be used within TelemetryProvider');
  return context;
};
