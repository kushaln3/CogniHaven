export interface KeystrokeEvent {
  key: string;
  keydownTimestamp: number;
  keyupTimestamp?: number;
}

export interface MouseTelemetryEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface TelemetryBatch {
  session_id: string;
  batch_start_time: number;
  batch_end_time: number;
  metrics: {
    avg_dwell_time_ms: number;
    avg_flight_time_ms: number;
    avg_mouse_velocity_px_ms: number;
  };
}

export const calculateMetrics = (
  keystrokes: KeystrokeEvent[],
  mouseMovements: MouseTelemetryEvent[],
  sessionId: string,
  startTime: number,
  endTime: number
): TelemetryBatch => {
  // Dwell Time: time a key is held down (keyup - keydown)
  const dwellTimes = keystrokes
    .filter((k) => k.keyupTimestamp !== undefined)
    .map((k) => k.keyupTimestamp! - k.keydownTimestamp);

  // Flight Time: time between key presses (keydown[i] - keyup[i-1])
  const flightTimes: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    const flight = keystrokes[i].keydownTimestamp - (keystrokes[i - 1].keyupTimestamp || keystrokes[i - 1].keydownTimestamp);
    if (flight > 0 && flight < 2000) { // Filter out long pauses (e.g. user left the keyboard)
      flightTimes.push(flight);
    }
  }

  // Mouse Velocity: pixels per millisecond
  const velocities: number[] = [];
  for (let i = 1; i < mouseMovements.length; i++) {
    const dx = mouseMovements[i].x - mouseMovements[i - 1].x;
    const dy = mouseMovements[i].y - mouseMovements[i - 1].y;
    const dt = mouseMovements[i].timestamp - mouseMovements[i - 1].timestamp;
    if (dt > 0) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      velocities.push(distance / dt);
    }
  }

  const avgDwell = dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0;
  const avgFlight = flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : 0;
  const avgVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;

  return {
    session_id: sessionId,
    batch_start_time: startTime,
    batch_end_time: endTime,
    metrics: {
      avg_dwell_time_ms: Number(avgDwell.toFixed(2)),
      avg_flight_time_ms: Number(avgFlight.toFixed(2)),
      avg_mouse_velocity_px_ms: Number(avgVelocity.toFixed(4)),
    },
  };
};
