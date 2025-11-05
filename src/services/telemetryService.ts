import { ApplicationInsights, SeverityLevel } from '@microsoft/applicationinsights-web';

class TelemetryService {
  private appInsights: ApplicationInsights | null = null;
  private initialized = false;

  initialize(connectionString: string): void {
    if (this.initialized) {
      console.warn('Application Insights already initialized');
      return;
    }

    console.log('✅ Initializing with connection string length:', connectionString.length);
    console.log('✅ Full connection string:', connectionString);
    
    if (!connectionString) {
      console.error('❌ Connection string is empty');
      return;
    }

    // Parse connection string components for debugging
    const parts = connectionString.split(';');
    const config: Record<string, string> = {};
    parts.forEach(part => {
      if (!part) {
        return;
      }
      const [rawKey, ...rawValueParts] = part.split('=');
      if (!rawKey || rawValueParts.length === 0) {
        return;
      }
      const key = rawKey.trim();
      const value = rawValueParts.join('=').trim();
      if (key && value) {
        config[key] = value;
      }
    });
    
    console.log('✅ Parsed connection string parts:', config);

    try {
      // Extract instrumentation key and ingestion endpoint explicitly
      const instrumentationKey = config.InstrumentationKey;
      const ingestionEndpoint = config.IngestionEndpoint;

      console.log('🔄 Using explicit configuration...');
      console.log('✅ Instrumentation Key:', instrumentationKey);
      console.log('✅ Ingestion Endpoint:', ingestionEndpoint);

      const endpointUrl = ingestionEndpoint
        ? `${ingestionEndpoint}${ingestionEndpoint.endsWith('/') ? '' : '/'}v2/track`
        : undefined;

      console.log('✅ Calculated endpointUrl:', endpointUrl);

      // Use full connection string alongside explicit endpoint override
      this.appInsights = new ApplicationInsights({
        config: {
          connectionString: connectionString,
          endpointUrl,
          enableAutoRouteTracking: true,
          enableCorsCorrelation: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          disableFetchTracking: false,
          disableAjaxTracking: false,
          maxBatchInterval: 0, // Send immediately for better debugging
          disableExceptionTracking: false,
          enableDebug: true, // Enable debug to see endpoint resolution
          enableUnhandledPromiseRejectionTracking: true,
        },
      });

      this.appInsights.loadAppInsights();
      
      // Wait a moment for initialization
      setTimeout(() => {
        this.appInsights?.trackPageView();
        console.log('✅ Page view tracked');
      }, 1000);
      
      this.initialized = true;

      // Expose to window for debugging
      (window as any).appInsights = this.appInsights;

      console.log('✅ Application Insights initialized successfully');
      console.log('✅ Configuration details:', {
        instrumentationKey,
        ingestionEndpoint,
        endpointUrl
      });
      
      // Test connectivity by sending a test event
      setTimeout(() => {
        this.trackEvent('ApplicationStartup', {
          timestamp: new Date().toISOString(),
          testConnection: 'true',
          initializationMethod: 'connectionString',
          region: 'westus2'
        });
        console.log('✅ Test connectivity event sent');
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to initialize Application Insights:', error);
      this.initialized = false;
    }
  }

  // Track custom events with properties
  trackEvent(name: string, properties?: { [key: string]: any }): void {
    if (!this.appInsights) {
      console.warn('Application Insights not initialized');
      return;
    }

    this.appInsights.trackEvent({ name }, properties);
  }

  // Track errors with detailed information including file and line number
  trackError(
    error: Error,
    severityLevel: SeverityLevel = SeverityLevel.Error,
    properties?: { [key: string]: any }
  ): void {
    if (!this.appInsights) {
      console.warn('Application Insights not initialized');
      return;
    }

    // Parse stack trace to get file and line number
    const stackInfo = this.parseStackTrace(error);

    // Ensure all properties are strings (Application Insights requirement)
    const enrichedProperties: { [key: string]: string } = {};
    
    // Add provided properties as strings
    if (properties) {
      Object.keys(properties).forEach(key => {
        enrichedProperties[key] = String(properties[key]);
      });
    }
    
    // Add stack info as strings
    if (stackInfo.fileName) enrichedProperties.fileName = stackInfo.fileName;
    if (stackInfo.lineNumber) enrichedProperties.lineNumber = stackInfo.lineNumber;
    if (stackInfo.columnNumber) enrichedProperties.columnNumber = stackInfo.columnNumber;
    
    // Add error details as strings
    enrichedProperties.errorMessage = error.message;
    enrichedProperties.errorName = error.name;
    enrichedProperties.timestamp = new Date().toISOString();

    // Send the exception to Application Insights
    try {
      console.log('🔄 Sending exception to Application Insights...');
      
      this.appInsights.trackException({
        exception: error,
        severityLevel,
        properties: enrichedProperties,
      });

      console.error('✅ Error tracked to Application Insights:', {
        error: error.message,
        properties: enrichedProperties,
        severityLevel: severityLevel
      });
      
      // Debug: Log property count and keys
      console.log('✅ Custom properties being sent:', Object.keys(enrichedProperties).length, 'properties');
      console.log('✅ Property keys:', Object.keys(enrichedProperties));
      console.log('✅ All properties:', enrichedProperties);
      
      // Additional validation
      console.log('✅ App Insights instance check:', !!this.appInsights);
      console.log('✅ Exception type:', error.name);
      console.log('✅ Exception message:', error.message);
      
      // Force flush after a small delay to allow batching
      setTimeout(() => {
        this.appInsights?.flush();
        console.log('✅ Telemetry flushed to Application Insights');
      }, 1000);
      
    } catch (trackingError) {
      console.error('❌ Failed to send telemetry to Application Insights:', trackingError);
      
      // Retry once after a delay
      setTimeout(() => {
        try {
          console.log('🔄 Retrying telemetry send...');
          this.appInsights?.trackException({
            exception: error,
            severityLevel,
            properties: { ...enrichedProperties, retryAttempt: 'true' },
          });
          this.appInsights?.flush();
          console.log('✅ Retry successful');
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
        }
      }, 3000);
    }
  }

  // Track traces (log messages)
  trackTrace(message: string, severityLevel: SeverityLevel = SeverityLevel.Information): void {
    if (!this.appInsights) {
      console.warn('Application Insights not initialized');
      return;
    }

    this.appInsights.trackTrace({ message, severityLevel });
  }

  // Track metrics
  trackMetric(name: string, average: number, properties?: { [key: string]: any }): void {
    if (!this.appInsights) {
      console.warn('Application Insights not initialized');
      return;
    }

    this.appInsights.trackMetric({ name, average }, properties);
  }

  // Parse stack trace to extract file and line number
  private parseStackTrace(error: Error): { fileName?: string; lineNumber?: string; columnNumber?: string } {
    if (!error.stack) {
      return {};
    }

    const stackLines = error.stack.split('\n');
    
    // Try to find the first meaningful line (usually the second line after the error message)
    for (let i = 1; i < stackLines.length; i++) {
      const line = stackLines[i];
      
      // Match patterns like:
      // at functionName (http://localhost:3000/src/file.tsx:123:45)
      // at http://localhost:3000/src/file.tsx:123:45
      const match = line.match(/(?:at\s+(?:.*?\s+)?\(?)(.*?):(\d+):(\d+)\)?$/);
      
      if (match) {
        const [, filePath, lineNum, colNum] = match;
        
        // Extract just the filename from the full path
        const fileName = filePath.split('/').pop() || filePath;
        
        return {
          fileName,
          lineNumber: lineNum,
          columnNumber: colNum,
        };
      }
    }

    return { fileName: 'unknown', lineNumber: 'unknown', columnNumber: 'unknown' };
  }

  // Flush any pending telemetry
  flush(): void {
    if (this.appInsights) {
      this.appInsights.flush();
    }
  }

  // Check if Application Insights is initialized
  isInitialized(): boolean {
    const result = this.initialized && this.appInsights !== null;
    console.log('🔍 TelemetryService.isInitialized():', {
      initialized: this.initialized,
      appInsightsExists: this.appInsights !== null,
      result: result
    });
    return result;
  }
}

export const telemetryService = new TelemetryService();
export { SeverityLevel };
