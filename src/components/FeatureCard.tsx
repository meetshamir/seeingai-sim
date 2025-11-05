import { useState } from 'react';
import { AIFeature, seeingAIService } from '../services/seeingAIService';

interface FeatureCardProps {
  feature: AIFeature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResult('');
    setError('');

    try {
      const analysisResult = await seeingAIService.analyzeImage(feature);
      setResult(analysisResult);
    } catch (err: any) {
      setError(`${err.name}: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="feature-card">
      <div className="feature-icon">{feature.icon}</div>
      <h3 className="feature-name">{feature.name}</h3>
      <p className="feature-description">{feature.description}</p>
      
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="analyze-button"
      >
        {isAnalyzing ? 'Analyzing...' : 'Try Feature'}
      </button>

      {result && (
        <div className="result-box success">
          <strong>Result:</strong>
          <p>{result}</p>
        </div>
      )}

      {error && (
        <div className="result-box error">
          <strong>Error:</strong>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
