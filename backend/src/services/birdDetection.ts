import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';

import { downloadImage } from '../utils/image';
import { BirdDetectionResult } from '../types';
import { birdSpecies } from '../data/birdLabels';
import { COCO_LABELS } from '../data/cocoLabels';
import { computeIoU } from '../utils/box';

// Interfaces para tipagem
interface DetectionClass {
  name: string;
  probability: number;
}

interface Detection {
  probability: number;
  index: number;
}

// Constantes para configuração do modelo
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.3; // Reduzido para 30% para mais sensibilidade
const NMS_IOU_THRESHOLD = 0.45;
const BIRD_CLASS_INDEX = 14; // Índice da classe 'bird' no COCO
const ROW_LENGTH = 85; // 4 (bbox) + 1 (conf) + 80 (classes)
const MIN_BIRD_SIZE = 0.01; // 1% da imagem

let session: ort.InferenceSession | null = null;

async function loadModel() {
  if (!session) {
    try {
      // Carregar o modelo YOLOv8 em formato ONNX
      const modelPath = path.join(__dirname, '../../public/models/birds-yolov8.onnx');
      session = await ort.InferenceSession.create(modelPath);
    } catch (error) {
      console.error('Erro ao carregar o modelo:', error);
      throw new Error('Falha ao carregar o modelo de detecção');
    }
  }
  return session;
}

async function preprocessImage(imageBuffer: Buffer): Promise<Float32Array> {
  try {
    // Melhorar a imagem para detecção
    const enhancedBuffer = await sharp(imageBuffer)
      // Primeiro ajusta o contraste e brilho
      .modulate({
        brightness: 1.1, // Aumenta levemente o brilho
        saturation: 1.2  // Aumenta a saturação para cores mais vivas
      })
      // Aplica um leve sharpening para melhorar bordas
      .sharpen({
        sigma: 1.2,
        m1: 0.5,
        m2: 0.5
      })
      // Redimensiona mantendo proporção
      .resize(640, 640, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .removeAlpha()
      .raw()
      .toBuffer();

    // Converter para Float32Array no formato CHW (Channel, Height, Width)
    const float32Data = new Float32Array(3 * 640 * 640);
    const channels = 3;
    const height = 640;
    const width = 640;
    
    // Reorganizar os pixels de HWC para CHW e normalizar
    for (let c = 0; c < channels; c++) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          const srcIdx = (h * width + w) * channels + c;
          const dstIdx = c * height * width + h * width + w;
          float32Data[dstIdx] = enhancedBuffer[srcIdx] / 255.0;
        }
      }
    }

    return float32Data;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw error;
  }
}

export async function processImage(imageUrl: string): Promise<BirdDetectionResult[]> {
  try {
    // Load model if not already loaded
    const inferenceSession = await loadModel();
    if (!inferenceSession) throw new Error('Modelo não foi carregado corretamente');
    
    // Download and preprocess image
    const imageBuffer = await downloadImage(imageUrl);
    const preprocessedData = await preprocessImage(imageBuffer);
    
    // Criar tensor de entrada
    const inputTensor = new ort.Tensor('float32', preprocessedData, [1, 3, 640, 640]);
    
    // Run inference
    const outputs = await inferenceSession.run({ images: inputTensor });
    const predictions = outputs['output0'].data as Float32Array;
    
    // Processar as predições do YOLOv8
    // Formato da saída do YOLOv8 é [batch, num_detections, num_classes] = [1, 8400, 85]
    const rowLength = 85; // 4 (bbox) + 1 (conf) + 80 (classes)
    const numPredictions = predictions.length / rowLength;
    const rawDetections: BirdDetectionResult[] = [];
    const nmsIoUThreshold = NMS_IOU_THRESHOLD;
    
    console.log('Processando', numPredictions, 'possíveis detecções...');

    for (let i = 0; i < numPredictions; i++) {
      const offset = i * rowLength;
      
      // Aplicar softmax nas pontuações de classe para obter probabilidades
      const classScores = predictions.slice(offset + 5, offset + 5 + COCO_LABELS.length);
      const maxScore = Math.max(...classScores);
      const expScores = classScores.map(score => Math.exp(score - maxScore));
      const sumExpScores = expScores.reduce((a, b) => a + b, 0);
      const probabilities = expScores.map(expScore => expScore / sumExpScores);
      
      const maxProbIndex = probabilities.indexOf(Math.max(...probabilities));
      const birdClassIndex = 14; // bird class index in COCO

      const birdClassProb = probabilities[birdClassIndex];
      const objConfidence = Math.max(0, Math.min(1, predictions[offset + 4]));
      const confidence = Math.max(0, Math.min(1, birdClassProb * objConfidence));

      // Log apenas quando detectar uma ave com confiança significativa
      if (birdClassProb > 0.2) {  // 20% de confiança para logging
        // Encontrar as 3 classes com maior probabilidade
        const topIndices: number[] = [];
        const tempProbs = [...probabilities];
        
        for (let j = 0; j < 3; j++) {
          const maxIdx = tempProbs.indexOf(Math.max(...tempProbs));
          if (maxIdx !== -1) {
            topIndices.push(maxIdx);
            tempProbs[maxIdx] = -1; // Marca como já usado
          }
        }

        // Criar strings de detecção
        const detectionTexts: string[] = topIndices.map(idx => {
          const prob = probabilities[idx];
          const className = COCO_LABELS[idx];
          return `${className} (${(prob * 100).toFixed(1)}%)`;
        });

        console.log(
          'Detecção:', 
          detectionTexts.join(', '),
          `[Obj: ${(objConfidence * 100).toFixed(1)}%]`
        );
      }

      // Verificar se é uma ave e atende aos critérios
      if (maxProbIndex === birdClassIndex && confidence > CONFIDENCE_THRESHOLD) {
        const [x, y, w, h] = [
          predictions[offset],
          predictions[offset + 1],
          predictions[offset + 2],
          predictions[offset + 3]
        ];

        // Calcular área relativa da detecção
        const area = w * h;
        const isLargeEnough = area > MIN_BIRD_SIZE;

        // Verificar se a detecção está dentro dos limites da imagem
        const isWithinBounds = x >= 0 && x + w <= 1 && y >= 0 && y + h <= 1;

        if (isLargeEnough && isWithinBounds) {
          const speciesName = 'Ave';
          
          rawDetections.push({
            species: speciesName,
            confidence: confidence,
            boundingBox: {
              x: x,
              y: y,
              width: w,
              height: h
            },
            metadata: {
              modelVersion: '1.0.0-yolov8-coco',
              speciesConfidence: confidence,
              detectionTime: new Date().toISOString(),
              originalClass: 'bird'
            }
          });
        }
      }
    }

    if (rawDetections.length === 0) {
      console.log('Nenhuma ave detectada que atenda aos critérios mínimos:');
      console.log(`- Confiança > ${(CONFIDENCE_THRESHOLD * 100).toFixed(1)}%`);
      console.log(`- Tamanho > ${(MIN_BIRD_SIZE * 100).toFixed(1)}% da imagem`);
      console.log('- Dentro dos limites da imagem');
    }

    // Sort detections by confidence score (descending)
    rawDetections.sort((a, b) => b.confidence - a.confidence);

    // Apply Non-Maximum Suppression (NMS)
    const finalDetections: BirdDetectionResult[] = [];
    for (const detection of rawDetections) {
      let shouldKeep = true;
      for (const finalDetection of finalDetections) {
        const iou = computeIoU(detection.boundingBox, finalDetection.boundingBox);
        if (iou > nmsIoUThreshold) {
          shouldKeep = false;
          break;
        }
      }
      if (shouldKeep) {
        finalDetections.push(detection);
      }
    }
    
    return finalDetections.length > 0 ? finalDetections : [{
      species: 'Desconhecido',
      confidence: 0,
      boundingBox: { x: 0, y: 0, width: 1, height: 1 },
      metadata: {
        modelVersion: '1.0.0-yolov8',
        speciesConfidence: 0,
        detectionTime: new Date().toISOString(),
        originalClass: 'unknown'
      }
    }];
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

function isBirdClass(className: string): boolean {
  const normalizedClass = className.toLowerCase();
  
  // Verifica palavras-chave gerais de aves
  const generalBirdKeywords = [
    'bird', 'ave', 'fowl', 'cock', 'hen', 'passaro', 'pássaro',
    'feather', 'wing', 'beak', 'nest'
  ];
  
  // Verifica se é uma palavra-chave geral
  const isGeneralBird = generalBirdKeywords.some(keyword => 
    normalizedClass.includes(keyword.toLowerCase())
  );

  if (isGeneralBird) return true;

  // Verifica se corresponde a alguma espécie conhecida
  return birdSpecies.some(species => {
    const allTerms = [
      ...species.commonNames,
      ...species.keywords,
      species.scientificName
    ].map(term => term.toLowerCase());

    return allTerms.some(term => normalizedClass.includes(term));
  });
}

function mapToKnownSpecies(className: string): string {
  const normalizedClass = className.toLowerCase();
  
  // Sistema de pontuação para encontrar a melhor correspondência
  const matches = birdSpecies.map(species => {
    let score = 0;
    
    // Verifica nome científico (maior peso)
    if (normalizedClass.includes(species.scientificName.toLowerCase())) {
      score += 5;
    }

    // Verifica nomes comuns
    species.commonNames.forEach(name => {
      if (normalizedClass.includes(name.toLowerCase())) {
        score += 3;
      }
    });

    // Verifica palavras-chave
    species.keywords.forEach(keyword => {
      if (normalizedClass.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    return {
      name: species.name,
      score
    };
  });

  // Ordena por pontuação e pega o melhor resultado
  matches.sort((a, b) => b.score - a.score);

  // Retorna a espécie com maior pontuação, se houver uma correspondência significativa
  return matches[0].score > 0 ? matches[0].name : 'Espécie Desconhecida';
}