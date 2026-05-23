export interface KeystrokeRawEvent {
  key: string;
  keydownTimestamp: number;
  keyupTimestamp?: number;
}

export interface MouseRawEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface KeystrokeMetric {
  dwell_time: number;
  flight_time: number;
}

export interface MouseMetric {
  x: number;
  y: number;
  dt: number; // time since last point in milliseconds
}

export interface TelemetryBatch {
  session_id: string;
  batch_start_time: number;
  batch_end_time: number;
  keystrokes: KeystrokeMetric[];
  mouse_movements: MouseMetric[];
}

export const extractRawMetrics = (
  keystrokes: KeystrokeRawEvent[],
  mouseMovements: MouseRawEvent[],
  sessionId: string,
  startTime: number,
  endTime: number
): TelemetryBatch => {
  // Extract Raw Keystroke Dynamics
  const keystrokeMetrics: KeystrokeMetric[] = [];
  for (let i = 0; i < keystrokes.length; i++) {
    const current = keystrokes[i];
    if (current.keyupTimestamp) {
      const dwell = current.keyupTimestamp - current.keydownTimestamp;
      let flight = 0;
      
      if (i > 0) {
        const previous = keystrokes[i - 1];
        flight = current.keydownTimestamp - (previous.keyupTimestamp || previous.keydownTimestamp);
      }

      // Only include valid dynamics (filter out massive pauses > 5s)
      if (dwell > 0 && dwell < 5000 && flight >= 0 && flight < 5000) {
        keystrokeMetrics.push({
          dwell_time: dwell,
          flight_time: flight,
        });
      }
    }
  }

  // Extract Raw Mouse Dynamics
  const mouseMetrics: MouseMetric[] = [];
  for (let i = 1; i < mouseMovements.length; i++) {
    const current = mouseMovements[i];
    const previous = mouseMovements[i - 1];
    const dt = current.timestamp - previous.timestamp;

    if (dt > 0 && dt < 1000) { // Only capture continuous movement
      mouseMetrics.push({
        x: current.x,
        y: current.y,
        dt: dt
      });
    }
  }

  return {
    session_id: sessionId,
    batch_start_time: startTime,
    batch_end_time: endTime,
    keystrokes: keystrokeMetrics,
    mouse_movements: mouseMetrics,
  };
};
