import { seeingAIService } from '../services/seeingAIService';

export function ErrorSimulator() {
  const handleCriticalError = () => {
    try {
      seeingAIService.triggerCriticalError();
    } catch (error) {
      console.error('Critical error triggered:', error);
    }
  };

  const handleWarning = () => {
    seeingAIService.triggerWarning();
    alert('Warning logged to Application Insights');
  };

  return (
    <div className="error-simulator">
      <h2>🔧 Error Simulation Controls</h2>
      <p>Test error tracking and telemetry</p>
      
      <div className="error-buttons">
        <button onClick={handleCriticalError} className="error-button critical">
          Trigger Critical Error
        </button>
        <button onClick={handleWarning} className="error-button warning">
          Trigger Warning
        </button>
      </div>

      <div className="info-box">
        <p>
          <strong>Note:</strong> All errors are automatically logged to Azure Application Insights
          with detailed information including file names and line numbers.
        </p>
      </div>
    </div>
  );
}
