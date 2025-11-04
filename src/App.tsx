import { useEffect, useState } from 'react';
import { FeatureCard } from './components/FeatureCard';
import { ErrorSimulator } from './components/ErrorSimulator';
import { aiFeatures } from './services/seeingAIService';
import { telemetryService } from './services/telemetryService';
import './App.css';

function App() {
  const [environment, setEnvironment] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Get Application Insights connection string from environment variable
    const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING;
    const env = import.meta.env.VITE_ENVIRONMENT || 'development';
    
    setEnvironment(env);

    if (connectionString) {
      telemetryService.initialize(connectionString);
      setIsInitialized(true);
      
      // Track app initialization
      telemetryService.trackEvent('App_Initialized', {
        environment: env,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('Application Insights connection string not found. Set VITE_APPINSIGHTS_CONNECTION_STRING environment variable.');
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>👁️ Seeing AI Simulation</h1>
        <p className="subtitle">AI-powered visual assistance simulation</p>
        <div className="env-badge">
          Environment: <strong>{environment}</strong>
          {isInitialized && <span className="status-dot"></span>}
        </div>
      </header>

      <main className="app-main">
        <section className="info-section">
          <h2>About This App</h2>
          <p>
            This is a simulation of Microsoft's Seeing AI app, demonstrating various AI-powered
            visual recognition features. All actions and errors are logged to Azure Application
            Insights for monitoring and analysis.
          </p>
        </section>

        <ErrorSimulator />

        <section className="features-section">
          <h2>AI Features</h2>
          <div className="features-grid">
            {aiFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </section>

        <section className="telemetry-section">
          <h3>📊 Monitoring & Telemetry</h3>
          <ul>
            <li>✅ Application Insights integration</li>
            <li>✅ Error tracking with file/line numbers</li>
            <li>✅ Custom event tracking</li>
            <li>✅ Performance metrics</li>
            <li>✅ Deployment slots (staging & production)</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>Seeing AI Simulation - Built with React, TypeScript & Azure</p>
        <p className="small">Errors are automatically tracked and sent to Azure Application Insights</p>
      </footer>
    </div>
  );
}

export default App;
