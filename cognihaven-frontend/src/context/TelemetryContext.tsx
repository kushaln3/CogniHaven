import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { extractRawMetrics, type KeystrokeRawEvent, type MouseRawEvent } from '../utils/telemetry';

interface TelemetryContextType {
  sessionId: string;
  riskScore: number;
  isFrozen: boolean;
  needsOtp: boolean;
  setRiskScore: (score: number) => void;
  resetOtp: () => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId] = useState(uuidv4());
  const [riskScore, setRiskScore] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);

  const keystrokesRef = useRef<KeystrokeRawEvent[]>([]);
  const mouseMovementsRef = useRef<MouseRawEvent[]>([]);
  const lastBatchTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // SECURITY: We only care about timing, so we don't need to store the specific key char
      // but we use the key name to match keyup events correctly.
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

      // Limit buffer size to 500 events per 3s batch to prevent memory spikes
      if (mouseMovementsRef.current.length > 500) {
        mouseMovementsRef.current.shift();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    const interval = setInterval(async () => {
      const now = Date.now();
      const startTime = lastBatchTimeRef.current;
      
      const batch = extractRawMetrics(
        keystrokesRef.current,
        mouseMovementsRef.current,
        sessionId,
        startTime,
        now
      );

      // Reset buffers
      keystrokesRef.current = [];
      // Keep last mouse position for next batch dt calculation
      if (mouseMovementsRef.current.length > 0) {
        const lastMove = mouseMovementsRef.current[mouseMovementsRef.current.length - 1];
        mouseMovementsRef.current = [lastMove];
      }
      
      lastBatchTimeRef.current = now;

      // Only stream if there is actually data to analyze
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
  }, [sessionId]);

  const resetOtp = () => setNeedsOtp(false);

  return (
    <TelemetryContext.Provider value={{ sessionId, riskScore, isFrozen, needsOtp, setRiskScore, resetOtp }}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('useTelemetry must be used within TelemetryProvider');
  return context;
};
