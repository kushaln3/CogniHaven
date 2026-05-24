import { useContext } from 'react';
import { TelemetryContext } from './TelemetryContextInstance';

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('useTelemetry must be used within TelemetryProvider');
  return context;
};
