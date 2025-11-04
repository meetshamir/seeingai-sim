import { ApplicationInsights, SeverityLevel } from '@microsoft/applicationinsights-web';

class TelemetryService {
  private appInsights: ApplicationInsights | null = null;
  private initialized = false;

  initialize(connectionString: string): void {
    if (this.initialized) {
      console.warn('Application Insights already initialized');
      return;
    }

    try {
      this.appInsights = new ApplicationInsights({
        config: {
          connectionString: connectionString,
          enableAutoRouteTracking: true,
          enableCorsCorrelation: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          disableFetchTracking: false,
          disableAjaxTracking: false,
          maxBatchInterval: 0,
          disableExceptionTracking: false,
          enableDebug: false,
          enableUnhandledPromiseRejectionTracking: true,
        },
      });

      this.appInsights.loadAppInsights();
      this.appInsights.trackPageView();
      this.initialized = true;

      console.log('Application Insights initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Application Insights:', error);
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

    const enrichedProperties = {
      ...properties,
      ...stackInfo,
      errorMessage: error.message,
      errorName: error.name,
      timestamp: new Date().toISOString(),
    };

    this.appInsights.trackException({
      exception: error,
      severityLevel,
      properties: enrichedProperties,
    });

    console.error('Error tracked to Application Insights:', {
      error: error.message,
      ...enrichedProperties,
    });
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
}

export const telemetryService = new TelemetryService();
export { SeverityLevel };
