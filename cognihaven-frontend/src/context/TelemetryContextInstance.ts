import { createContext } from 'react';
import { type TelemetryContextType } from './TelemetryContext';

export const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);
