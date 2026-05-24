import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { SessionFrozen } from './components/SessionFrozen';
import { OtpModal } from './components/OtpModal';
import { CalibrationModal } from './components/CalibrationModal';
import { AdminLogin } from './components/AdminLogin';
import { LiveSOC } from './components/LiveSOC';

const AppContent: React.FC = () => {
  const { isFrozen, needsOtp, enrollSession, isCalibrated, username } = useTelemetry();

  return (
    <>
      {isFrozen && <SessionFrozen />}
      {needsOtp && <OtpModal />}
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            !username ? (
              <Navigate to="/" />
            ) : !isCalibrated ? (
              <CalibrationModal onComplete={enrollSession} />
            ) : (
              <Dashboard />
            )
          } 
        />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/soc-admin" element={<LiveSOC />} />
        <Route path="*" element={<Navigate to="/" />} />
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
