export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BirdDetectionResult {
  species: string;
  confidence: number;
  boundingBox: BoundingBox;
  metadata: {
    modelVersion: string;
    speciesConfidence: number;
    detectionTime: string;
    originalClass?: string;
  };
}

export interface Detection {
  class: string;
  score: number;
  bbox: number[];
}