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

    // Randomly trigger errors for demonstration (20% chance)
    if (Math.random() < 0.2) {
      return this.simulateError(feature);
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
