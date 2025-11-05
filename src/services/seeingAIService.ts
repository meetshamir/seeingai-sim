import { telemetryService, SeverityLevel } from './telemetryService';

export interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const aiFeatures: AIFeature[] = [
  {
    id: 'short-text',
    name: 'Short Text',
    description: 'Read short text from images',
    icon: '📝',
  },
  {
    id: 'document',
    name: 'Document',
    description: 'Read documents and text',
    icon: '📄',
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Scan barcodes and product info',
    icon: '🏷️',
  },
  {
    id: 'person',
    name: 'Person',
    description: 'Recognize people and faces',
    icon: '👤',
  },
  {
    id: 'scene',
    name: 'Scene',
    description: 'Describe scenes and surroundings',
    icon: '🌆',
  },
  {
    id: 'color',
    name: 'Color',
    description: 'Identify colors',
    icon: '🎨',
  },
  {
    id: 'currency',
    name: 'Currency',
    description: 'Recognize currency notes',
    icon: '💵',
  },
  {
    id: 'handwriting',
    name: 'Handwriting',
    description: 'Read handwritten text',
    icon: '✍️',
  },
];

export class SeeingAIService {
  // Simulate image analysis with random results
  async analyzeImage(feature: AIFeature, imageFile?: File): Promise<string> {
    // Track the analysis event
    telemetryService.trackEvent('AI_Analysis_Started', {
      feature: feature.name,
      featureId: feature.id,
      hasImage: !!imageFile,
    });

    // Simulate processing time
    await this.delay(1500);

    // Intelligent error simulation based on realistic production scenarios
    const randomValue = Math.random();
    
    if (feature.id === 'short-text') {
      // Short text has known production issues
      if (randomValue < 0.05) {
        // 5% chance of critical production error (memory, DB, rate limiting)
        return this.simulateServerSideError(feature);
      } else if (randomValue < 0.20) {
        // 15% chance of performance degradation (non-fatal)
        this.simulatePerformanceDegradation(feature);
      }
    } else {
      // Other features have lower error rates  
      if (randomValue < 0.08) {
        return this.simulateError(feature);
      }
    }

    // Generate mock results based on feature
    const result = this.generateMockResult(feature);

    telemetryService.trackEvent('AI_Analysis_Completed', {
      feature: feature.name,
      featureId: feature.id,
      resultLength: result.length,
    });

    // Track metric for analysis duration
    telemetryService.trackMetric('AnalysisDuration', 1500, {
      feature: feature.name,
    });

    return result;
  }

  private simulateServerSideError(feature: AIFeature): never {
    // Simulate a realistic production issue: Memory leak in image processing pipeline
    const scenarios = [
      {
        error: new Error('Out of memory processing large image batch. Current heap usage: 4.2GB/4GB available.'),
        name: 'OutOfMemoryException',
        stackTrace: `OutOfMemoryException: Out of memory processing large image batch. Current heap usage: 4.2GB/4GB available.
   at SeeingAI.ImageProcessing.BatchProcessor.ProcessImageBatch(List<ImageRequest> images) in C:\\src\\SeeingAI\\Services\\BatchProcessor.cs:line 89
   at SeeingAI.ImageProcessing.ImageOptimizer.OptimizeForOCR(Byte[] imageData, ImageSettings settings) in C:\\src\\SeeingAI\\Services\\ImageOptimizer.cs:line 234
   at SeeingAI.TextRecognition.OCRProcessor.ProcessImage(ImageRequest request) in C:\\src\\SeeingAI\\Services\\OCRProcessor.cs:line 147
   at SeeingAI.Controllers.TextAnalysisController.AnalyzeShortText(AnalysisRequest request) in C:\\src\\SeeingAI\\Controllers\\TextAnalysisController.cs:line 68`,
        properties: {
          issueType: 'Memory Management',
          sourceFile: 'BatchProcessor.cs',
          sourceLine: '89',
          serverComponent: 'ImageProcessing.BatchProcessor',
          serverEndpoint: '/api/v2/text/analyze-batch',
          httpMethod: 'POST',
          errorCategory: 'Resource Exhaustion',
          impactLevel: 'High',
          heapUsage: '4.2GB',
          maxHeapSize: '4GB',
          imageCount: '147',
          avgImageSize: '2.8MB',
          totalBatchSize: '411MB',
          processingTimeMs: '45230',
          retryAttempt: '3',
          circuitBreakerState: 'Open'
        }
      },
      {
        error: new Error('Database connection pool exhausted. Active connections: 100/100. Wait timeout exceeded.'),
        name: 'ConnectionPoolExhaustedException', 
        stackTrace: `ConnectionPoolExhaustedException: Database connection pool exhausted. Active connections: 100/100. Wait timeout exceeded.
   at Microsoft.EntityFrameworkCore.Storage.RelationalConnection.OpenDbConnection(Boolean errorsExpected) in DbConnection.cs:line 298
   at SeeingAI.Data.Repositories.AnalysisRepository.SaveAnalysisResult(AnalysisResult result) in C:\\src\\SeeingAI\\Data\\AnalysisRepository.cs:line 156
   at SeeingAI.Services.AnalysisService.CompleteAnalysis(String analysisId, String result) in C:\\src\\SeeingAI\\Services\\AnalysisService.cs:line 203
   at SeeingAI.Controllers.TextAnalysisController.AnalyzeShortText(AnalysisRequest request) in C:\\src\\SeeingAI\\Controllers\\TextAnalysisController.cs:line 95`,
        properties: {
          issueType: 'Database Connectivity',
          sourceFile: 'AnalysisRepository.cs',
          sourceLine: '156',
          serverComponent: 'Data.AnalysisRepository',
          serverEndpoint: '/api/v2/text/analyze',
          httpMethod: 'POST',
          errorCategory: 'Infrastructure',
          impactLevel: 'Critical',
          activeConnections: '100',
          maxConnections: '100',
          waitTimeoutMs: '30000',
          queuedRequests: '47',
          avgResponseTime: '12500ms',
          connectionLeakSuspected: 'true',
          lastConnectionReset: '2 hours ago'
        }
      },
      {
        error: new Error('Azure Cognitive Services rate limit exceeded. Quota: 20 TPS, Current: 23.4 TPS. Retry after: 45 seconds.'),
        name: 'RateLimitExceededException',
        stackTrace: `RateLimitExceededException: Azure Cognitive Services rate limit exceeded. Quota: 20 TPS, Current: 23.4 TPS. Retry after: 45 seconds.
   at SeeingAI.ExternalServices.CognitiveServicesClient.CallOCRService(String imageBase64) in C:\\src\\SeeingAI\\ExternalServices\\CognitiveServicesClient.cs:line 178
   at SeeingAI.TextRecognition.OCRProcessor.ExtractTextFromImage(ProcessingRequest request) in C:\\src\\SeeingAI\\Services\\OCRProcessor.cs:line 289
   at SeeingAI.Services.AnalysisService.ProcessTextAnalysis(AnalysisRequest request) in C:\\src\\SeeingAI\\Services\\AnalysisService.cs:line 134
   at SeeingAI.Controllers.TextAnalysisController.AnalyzeShortText(AnalysisRequest request) in C:\\src\\SeeingAI\\Controllers\\TextAnalysisController.cs:line 52`,
        properties: {
          issueType: 'External Service Limit',
          sourceFile: 'CognitiveServicesClient.cs', 
          sourceLine: '178',
          serverComponent: 'ExternalServices.CognitiveServicesClient',
          serverEndpoint: '/api/v2/text/analyze',
          httpMethod: 'POST',
          errorCategory: 'Rate Limiting',
          impactLevel: 'Medium',
          currentTPS: '23.4',
          allowedTPS: '20',
          retryAfterSeconds: '45',
          quotaResetTime: '2025-11-05T02:00:00Z',
          failedRequestsLast5Min: '127',
          circuitBreakerTriggered: 'true',
          suggestedFix: 'Implement exponential backoff and request queuing'
        }
      }
    ];

    // Select random realistic scenario
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    // Override the stack property
    Object.defineProperty(scenario.error, 'stack', {
      value: scenario.stackTrace,
      writable: false
    });
    scenario.error.name = scenario.name;

    // Track with comprehensive production context
    telemetryService.trackError(scenario.error, SeverityLevel.Error, {
      // Base context
      feature: feature.name,
      featureId: feature.id,
      context: 'Production Issue',
      
      // Error classification
      errorType: scenario.name,
      ...scenario.properties,
      
      // Infrastructure context
      serverVersion: '2.1.4',
      environment: 'Production',
      region: 'West US 2',
      instanceId: 'seeingai-web-' + Math.random().toString(36).substr(2, 6),
      correlationId: this.generateCorrelationId(),
      sessionId: 'sess_' + Date.now().toString(36),
      
      // Operational context
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.split(' ')[0], // Simplified
      clientIP: '10.0.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
      loadBalancerNode: 'lb-node-' + (Math.floor(Math.random() * 4) + 1),
      
      // Performance metrics
      currentCPU: (60 + Math.random() * 35).toFixed(1) + '%',
      currentMemory: (70 + Math.random() * 25).toFixed(1) + '%',
      diskIOPS: Math.floor(400 + Math.random() * 200).toString(),
      
      // Business context
      dailyRequestCount: Math.floor(50000 + Math.random() * 20000).toString(),
      currentActiveUsers: Math.floor(150 + Math.random() * 100).toString(),
      peakHourIndicator: 'true',
      
      // Debugging aids
      reproducible: 'true',
      severity: 'P1',
      needsImmediateAttention: 'true',
      potentialDataLoss: 'false',
      customerImpact: 'Multiple users affected',
      estimatedAffectedUsers: Math.floor(50 + Math.random() * 200).toString()
    });

    throw scenario.error;
  }

  private simulateError(feature: AIFeature): never {
    const errorTypes = [
      {
        name: 'ImageProcessingError',
        message: 'Failed to process image: Invalid image format',
      },
      {
        name: 'APITimeoutError',
        message: 'Azure Cognitive Services API request timed out',
      },
      {
        name: 'InsufficientLightError',
        message: 'Image too dark for analysis',
      },
      {
        name: 'NetworkError',
        message: 'Network connection lost during processing',
      },
      {
        name: 'ModelError',
        message: `AI model for ${feature.name} is currently unavailable`,
      },
    ];

    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const error = new Error(randomError.message);
    error.name = randomError.name;

    // Track the error with telemetry
    telemetryService.trackError(error, SeverityLevel.Error, {
      feature: feature.name,
      featureId: feature.id,
      errorType: randomError.name,
      context: 'Image Analysis',
    });

    throw error;
  }

  private generateMockResult(feature: AIFeature): string {
    const mockResults: { [key: string]: string[] } = {
      'short-text': [
        'STOP',
        'EXIT',
        'Open 9 AM - 5 PM',
        'Welcome to the building',
        'Emergency Exit',
      ],
      document: [
        'This is a sample document with multiple lines of text...',
        'Invoice #12345\nDate: Nov 4, 2025\nAmount: $150.00',
        'Chapter 1: Introduction\n\nThis chapter covers the basics...',
      ],
      product: [
        'Product: Organic Milk\nBrand: Fresh Farms\nPrice: $4.99',
        'Barcode: 012345678901\nProduct not found in database',
        'Cereal Box - Whole Grain\nNet weight: 500g',
      ],
      person: [
        'One person detected, smiling, age approximately 30-40',
        'Multiple people in frame: 3 adults, 1 child',
        'Person detected wearing glasses',
      ],
      scene: [
        'A modern office with glass windows, several desks with computers, and people working',
        'Outdoor park scene with trees, benches, and a walking path',
        'Kitchen interior with stainless steel appliances and marble countertops',
      ],
      color: [
        'Primary color: Navy Blue (#001F3F)',
        'Dominant colors: Red, White, and Blue',
        'Light green shade detected',
      ],
      currency: [
        'US $20 bill detected',
        'Multiple bills: $5, $10, $20 totaling $35',
        'Euro €50 note',
      ],
      handwriting: [
        'Handwritten note: "Meeting at 3 PM in conference room B"',
        'Shopping list: Milk, Eggs, Bread, Butter',
        'Signature: John Smith',
      ],
    };

    const results = mockResults[feature.id] || ['Analysis complete'];
    return results[Math.floor(Math.random() * results.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to trigger a critical error manually
  triggerCriticalError(): never {
    const error = new Error('Critical system failure: Memory allocation error');
    error.name = 'CriticalSystemError';

    telemetryService.trackError(error, SeverityLevel.Critical, {
      context: 'Manual Error Trigger',
      severity: 'Critical',
      requiresImmediateAttention: true,
    });

    throw error;
  }

  // Simulate performance degradation (warning-level issue)
  private simulatePerformanceDegradation(feature: AIFeature): void {
    const performanceIssues = [
      {
        message: 'Image processing taking longer than expected due to high CPU utilization',
        properties: {
          issueType: 'Performance Degradation',
          component: 'ImageProcessor',
          avgProcessingTime: '4500ms',
          expectedProcessingTime: '1200ms',
          performanceDelta: '+275%',
          cpuUtilization: '89%',
          memoryPressure: 'Medium',
          recommendedAction: 'Scale out processing nodes'
        }
      },
      {
        message: 'Database query performance degraded - potential index fragmentation detected',
        properties: {
          issueType: 'Database Performance',
          component: 'AnalysisRepository',
          avgQueryTime: '2800ms', 
          expectedQueryTime: '150ms',
          performanceDelta: '+1767%',
          indexFragmentation: '78%',
          tableScans: '23',
          recommendedAction: 'Rebuild indexes during maintenance window'
        }
      }
    ];

    const issue = performanceIssues[Math.floor(Math.random() * performanceIssues.length)];
    
    telemetryService.trackTrace(issue.message, SeverityLevel.Warning);
    telemetryService.trackEvent('PerformanceDegradation', {
      feature: feature.name,
      featureId: feature.id,
      ...issue.properties,
      timestamp: new Date().toISOString(),
      environment: 'Production',
      correlationId: this.generateCorrelationId()
    });
  }

  // Generate correlation ID for server requests
  private generateCorrelationId(): string {
    return 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  // Method to trigger specific production scenario for SRE investigation
  triggerProductionIncident(): never {
    console.log('🚨 TRIGGERING PRODUCTION INCIDENT SIMULATION...');
    
    // Force the most realistic production scenario - database connection pool exhaustion
    const error = new Error('Database connection pool exhausted. Active connections: 100/100. Wait timeout exceeded.');
    error.name = 'ConnectionPoolExhaustedException';
    
    console.log('🚨 Created error object:', error.name, error.message);
    
    const stackTrace = `ConnectionPoolExhaustedException: Database connection pool exhausted. Active connections: 100/100. Wait timeout exceeded.
   at Microsoft.EntityFrameworkCore.Storage.RelationalConnection.OpenDbConnection(Boolean errorsExpected) in DbConnection.cs:line 298
   at SeeingAI.Data.Repositories.AnalysisRepository.SaveAnalysisResult(AnalysisResult result) in C:\\\\src\\\\SeeingAI\\\\Data\\\\AnalysisRepository.cs:line 156
   at SeeingAI.Services.AnalysisService.CompleteAnalysis(String analysisId, String result) in C:\\\\src\\\\SeeingAI\\\\Services\\\\AnalysisService.cs:line 203
   at SeeingAI.Controllers.TextAnalysisController.AnalyzeShortText(AnalysisRequest request) in C:\\\\src\\\\SeeingAI\\\\Controllers\\\\TextAnalysisController.cs:line 95`;
    
    Object.defineProperty(error, 'stack', {
      value: stackTrace,
      writable: false
    });

    console.log('🚨 About to send telemetry with properties...');
    
    const telemetryProperties = {
      // Issue classification
      issueType: 'Database Connectivity',
      errorType: 'ConnectionPoolExhaustedException',
      context: 'Production Incident - SRE Investigation',
      
      // Root cause indicators
      sourceFile: 'AnalysisRepository.cs',
      sourceLine: '156', 
      serverComponent: 'Data.AnalysisRepository',
      rootCauseCategory: 'Connection Leak',
      
      // Business impact
      impactLevel: 'Critical',
      customerImpact: 'Service unavailable for text analysis',
      estimatedAffectedUsers: '347',
      businessFunction: 'Text Recognition Service',
      
      // Technical details for debugging
      activeConnections: '100',
      maxConnections: '100', 
      waitTimeoutMs: '30000',
      queuedRequests: '47',
      avgResponseTime: '12500ms',
      connectionLeakSuspected: 'true',
      lastConnectionReset: '2 hours ago',
      
      // Infrastructure context
      serverEndpoint: '/api/v2/text/analyze',
      httpMethod: 'POST',
      environment: 'Production',
      region: 'West US 2',
      instanceId: 'seeingai-web-prod-01',
      correlationId: this.generateCorrelationId(),
      
      // SRE context
      severity: 'P0',
      needsImmediateAttention: 'true',
      potentialDataLoss: 'false',
      runbookLink: 'https://wiki.company.com/sre/runbooks/connection-pool-exhaustion',
      escalationPath: 'Platform Team -> Database Team',
      
      // Suggested resolution steps
      suggestedFix: 'Implement connection pooling with proper disposal patterns',
      codeReviewRequired: 'true',
      githubIssueNeeded: 'true',
      
      // Monitoring correlation
      alertTriggered: 'DatabaseConnectionPoolExhausted', 
      dashboardLink: 'https://grafana.company.com/d/database-health',
      
      timestamp: new Date().toISOString()
    };
    
    console.log('🚨 Telemetry properties object:', telemetryProperties);
    console.log('🚨 Properties count:', Object.keys(telemetryProperties).length);
    
    telemetryService.trackError(error, SeverityLevel.Critical, telemetryProperties);
    
    console.log('🚨 Telemetry sent! About to throw error...');

    throw error;
  }

  // Method to trigger a warning
  triggerWarning(): void {
    const warningMessage = 'Low memory warning: System performance may be degraded';
    
    telemetryService.trackTrace(warningMessage, SeverityLevel.Warning);
    
    telemetryService.trackEvent('System_Warning', {
      type: 'LowMemory',
      timestamp: new Date().toISOString(),
    });
  }
}

export const seeingAIService = new SeeingAIService();
