import React, { useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [latestFeatures, setLatestFeatures] = useState(null);
  const [latestExplanation, setLatestExplanation] = useState(null);

  const handlePredictionComplete = (prediction, features) => {
    setLatestPrediction(prediction);
    setLatestFeatures(features);
    setLatestExplanation(null); // Reset explanation on new assessment
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface relative overflow-x-hidden font-body-md">
      {/* Background Gradients & Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-pattern opacity-60"></div>
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-primary-container/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-1/3 -right-40 w-[550px] h-[550px] bg-secondary-container/10 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Top Sticky Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="page-transition flex-1 w-full max-w-[1920px] min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 z-10">
        {activeTab === 'landing' && (
          <LandingPage setActiveTab={setActiveTab} />
        )}

        {activeTab === 'assessment' && (
          <AssessmentPage
            onPredictionComplete={handlePredictionComplete}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'results' && (
          <ResultsPage
            prediction={latestPrediction}
            formData={latestFeatures}
            explanation={latestExplanation}
            setExplanation={setLatestExplanation}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'explainability' && (
          <ExplainabilityPage
            currentFeatures={latestFeatures}
            predictionId={latestPrediction?.prediction_id}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsPage />
        )}

        {activeTab === 'model-transparency' && (
          <ModelTransparencyPage setActiveTab={setActiveTab} />
        )}

        {activeTab === 'batch' && (
          <BatchAnalysisPage />
        )}

        {activeTab === 'report' && (
          <ReportPage 
            latestPrediction={latestPrediction}
            latestFeatures={latestFeatures}
            latestExplanation={latestExplanation}
            setLatestExplanation={setLatestExplanation}
            setActiveTab={setActiveTab}
          />
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
