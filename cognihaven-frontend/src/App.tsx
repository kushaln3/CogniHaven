import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { SOCDashboard } from './components/SOCDashboard';
import { SessionFrozen } from './components/SessionFrozen';
import { OtpModal } from './components/OtpModal';

const AppContent: React.FC = () => {
  const { isFrozen, needsOtp } = useTelemetry();

  return (
    <>
      {isFrozen && <SessionFrozen />}
      {needsOtp && <OtpModal />}
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/soc-admin" element={<SOCDashboard />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <TelemetryProvider>
        <AppContent />
      </TelemetryProvider>
    </Router>
  );
}

export default App;
