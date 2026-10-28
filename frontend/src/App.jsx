import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import AssessmentPage from './pages/AssessmentPage';
import ResultsPage from './pages/ResultsPage';
import ExplainabilityPage from './pages/ExplainabilityPage';
import InsightsPage from './pages/InsightsPage';
import ModelTransparencyPage from './pages/ModelTransparencyPage';
import BatchAnalysisPage from './pages/BatchAnalysisPage';
import ReportPage from './pages/ReportPage';
import DisclaimerPage from './pages/DisclaimerPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // For now, allow access without authentication
  // Uncomment the following lines to enable authentication when MongoDB is available
  // if (!isAuthenticated()) {
  //   return <Navigate to="/login" replace />;
  // }

  return children;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('landing');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [latestFeatures, setLatestFeatures] = useState(null);
  const [latestExplanation, setLatestExplanation] = useState(null);
  const { user, logout } = useAuth();

  const handlePredictionComplete = (prediction, features) => {
    setLatestPrediction(prediction);
    setLatestFeatures(features);
    setLatestExplanation(null);
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface relative overflow-x-hidden font-body-md">
      {/* Background Gradients & Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-pattern opacity-60"></div>
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-primary-container/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-1/3 -right-40 w-[550px] h-[550px] bg-secondary-container/10 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Top Sticky Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={logout} />

      {/* Main Content Area */}
      <main className="page-transition flex-1 w-full max-w-[1920px] min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 z-10">
        {activeTab === 'landing' && (
          <LandingPage setActiveTab={setActiveTab} />
        )}

        {activeTab === 'assessment' && (
          <ProtectedRoute>
            <AssessmentPage
              onPredictionComplete={handlePredictionComplete}
              setActiveTab={setActiveTab}
            />
          </ProtectedRoute>
        )}

        {activeTab === 'results' && (
          <ProtectedRoute>
            <ResultsPage
              prediction={latestPrediction}
              formData={latestFeatures}
              explanation={latestExplanation}
              setExplanation={setLatestExplanation}
              setActiveTab={setActiveTab}
            />
          </ProtectedRoute>
        )}

        {activeTab === 'explainability' && (
          <ProtectedRoute>
            <ExplainabilityPage
              currentFeatures={latestFeatures}
              predictionId={latestPrediction?.prediction_id}
              setActiveTab={setActiveTab}
            />
          </ProtectedRoute>
        )}

        {activeTab === 'insights' && (
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        )}

        {activeTab === 'model-transparency' && (
          <ProtectedRoute>
            <ModelTransparencyPage setActiveTab={setActiveTab} />
          </ProtectedRoute>
        )}

        {activeTab === 'batch' && (
          <ProtectedRoute>
            <BatchAnalysisPage />
          </ProtectedRoute>
        )}

        {activeTab === 'report' && (
          <ProtectedRoute>
            <ReportPage
              latestPrediction={latestPrediction}
              latestFeatures={latestFeatures}
              latestExplanation={latestExplanation}
              setLatestExplanation={setLatestExplanation}
              setActiveTab={setActiveTab}
            />
          </ProtectedRoute>
        )}

        {activeTab === 'disclaimer' && (
          <DisclaimerPage />
        )}

      </main>

      {/* Shared Footer */}
      <Footer setActiveTab={setActiveTab} />
      <ChatPage latestPrediction={latestPrediction} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}
