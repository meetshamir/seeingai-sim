import { useState, useEffect } from 'react';
import { seeingAIService, aiFeatures } from '../services/seeingAIService';
import { telemetryService } from '../services/telemetryService';

export function ErrorSimulator() {
  const [status, setStatus] = useState<string>('');
  const [isAppInsightsReady, setIsAppInsightsReady] = useState<boolean>(false);

  // Check Application Insights status
  useEffect(() => {
    const checkAppInsights = () => {
      // Check if telemetry service is initialized
      const isInitialized = telemetryService.isInitialized();
      setIsAppInsightsReady(isInitialized);
    };
    
    checkAppInsights();
    // Re-check every 2 seconds
    const interval = setInterval(checkAppInsights, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCriticalError = () => {
    setStatus('🚨 Sending critical error to Application Insights...');
    
    try {
      // Don't catch the error - let it propagate so Application Insights can track it
      seeingAIService.triggerCriticalError();
    } catch (error) {
      setStatus('✅ Critical error sent to Application Insights! Check the Failures tab.');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const handleWarning = () => {
    setStatus('⚠️ Sending warning to Application Insights...');
    
    seeingAIService.triggerWarning();
    
    setStatus('✅ Warning sent to Application Insights! Check the Logs tab.');
    setTimeout(() => setStatus(''), 5000);
  };

  const handleServerError = async () => {
    setStatus('🔥 Triggering server-side error in Short Text feature...');
    
    try {
      const shortTextFeature = aiFeatures.find(f => f.id === 'short-text')!;
      await seeingAIService.analyzeImage(shortTextFeature);
    } catch (error) {
      setStatus('✅ Server-side error sent to Application Insights! Check the Failures tab.');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const handleProductionIncident = () => {
    setStatus('😨 Simulating P0 production incident for SRE investigation...');
    
    try {
      seeingAIService.triggerProductionIncident();
    } catch (error) {
      setStatus('✅ Production incident logged! Ready for SRE Agent analysis and GitHub issue creation.');
      setTimeout(() => setStatus(''), 7000);
    }
  };

  return (
    <div className="error-simulator">
      <h2>🔧 Error Simulation Controls</h2>
      <p>Test error tracking and telemetry</p>
      
      {/* Application Insights Status */}
      <div className={`status-indicator ${isAppInsightsReady ? 'ready' : 'not-ready'}`}>
        <span className={`status-dot ${isAppInsightsReady ? 'green' : 'red'}`}></span>
        <span>
          Application Insights: {isAppInsightsReady ? '✅ Connected' : '❌ Not Connected'}
        </span>
      </div>
      
      {/* Status Message */}
      {status && (
        <div className="status-message">
          {status}
        </div>
      )}
      
      <div className="error-buttons">
        <button 
          onClick={handleCriticalError} 
          className="error-button critical"
          disabled={!isAppInsightsReady}
        >
          Trigger Critical Error
        </button>
        <button 
          onClick={handleWarning} 
          className="error-button warning"
          disabled={!isAppInsightsReady}
        >
          Trigger Warning
        </button>
        <button 
          onClick={handleServerError} 
          className="error-button server"
          disabled={!isAppInsightsReady}
        >
          Trigger Server Error (Short Text)
        </button>
        <button 
          onClick={handleProductionIncident} 
          className="error-button production"
          disabled={!isAppInsightsReady}
        >
          😨 Simulate Production Incident (P0)
        </button>
      </div>

      <div className="info-box">
        <p>
          <strong>Note:</strong> All errors are automatically logged to Azure Application Insights
          with detailed information including file names and line numbers.
        </p>
        <ul>
          <li><strong>Critical Error:</strong> Client-side JavaScript exception</li>
          <li><strong>Warning:</strong> Application trace/log message</li>
          <li><strong>Server Error:</strong> Random realistic production issues (Memory/DB/Rate Limits)</li>
          <li><strong>😨 Production Incident:</strong> Realistic P0 database connection pool exhaustion with full SRE context</li>
        </ul>
        <div className="sre-context">
          🎯 <strong>SRE Ready:</strong> The Production Incident generates comprehensive telemetry with root cause indicators, 
          business impact metrics, and debugging context perfect for SRE Agent investigation and GitHub Copilot resolution.
        </div>
        {!isAppInsightsReady && (
          <p className="warning-text">
            <strong>Warning:</strong> Application Insights is not connected. 
            Telemetry will not be sent until the connection is established.
          </p>
        )}
      </div>
    </div>
  );
}
