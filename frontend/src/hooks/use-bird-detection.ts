import { useState, useEffect, useRef } from 'react';
import * as ort from 'onnxruntime-web';

interface BirdDetection {
  species: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface YOLOPrediction {
  label: number;
  confidence: number;
  bbox: number[];  // [x1, y1, x2, y2]
}

export function useBirdDetection() {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<number>(0);
  const processingRef = useRef(false);
  const lastProcessTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Criar canvas uma vez e reutilizar
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = 640;
    canvasRef.current.height = 640;
    
    return () => {
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function loadModel() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Configurar o ONNX Runtime Web
        // Deixar o ONNX Runtime carregar os WASMs automaticamente do node_modules
        ort.env.wasm.numThreads = 1; // Usar apenas 1 thread para maior compatibilidade
        ort.env.wasm.simd = true; // Habilitar SIMD se disponível
        
        // Carregando o modelo YOLOv8 em formato ONNX
        const modelPath = '/models/birds-yolov8.onnx';
        
        console.log('Carregando modelo de:', modelPath);
        
        const session = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
          executionMode: 'sequential',
          enableCpuMemArena: true,
          enableMemPattern: true
        });
        
        console.log('Modelo carregado com sucesso!');
        console.log('Input names:', session.inputNames);
        console.log('Output names:', session.outputNames);
        setSession(session);
      } catch (err) {
        const error = err as Error;
        setError('Erro ao carregar o modelo de detecção');
        console.error('Erro ao carregar modelo:', err);
        console.error('Detalhes:', error.message);
        console.error('Stack:', error.stack);
      } finally {
        setIsLoading(false);
      }
    }

    loadModel();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const processFrame = async (video: HTMLVideoElement): Promise<BirdDetection | null> => {
    if (!session || !video || processingRef.current || !canvasRef.current) return null;

    // Limitar a taxa de processamento para evitar sobrecarga e flickering
    const now = Date.now();
    const minInterval = 500; // Processar no máximo a cada 500ms (2 fps)
    if (now - lastProcessTimeRef.current < minInterval) {
      return null;
    }
    lastProcessTimeRef.current = now;

    try {
      processingRef.current = true;
      
      // Usar o canvas reutilizável
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { 
        willReadFrequently: true,
        alpha: false 
      });
      if (!ctx) return null;
      
      // Redimensionar e desenhar o frame do vídeo no canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Converter para tensor do ONNX Runtime no formato CHW (Channel, Height, Width)
      // YOLOv8 espera: todos os valores R, depois todos os G, depois todos os B
      const input = new Float32Array(canvas.width * canvas.height * 3);
      const pixelCount = canvas.width * canvas.height;
      
      for (let i = 0; i < pixelCount; i++) {
        input[i] = imageData.data[i * 4] / 255.0; // R
        input[pixelCount + i] = imageData.data[i * 4 + 1] / 255.0; // G
        input[pixelCount * 2 + i] = imageData.data[i * 4 + 2] / 255.0; // B
      }
      
      // Criar tensor de entrada
      const inputTensor = new ort.Tensor('float32', input, [1, 3, canvas.height, canvas.width]);
      
      // Fazer a predição
      const outputs = await session.run({ images: inputTensor });
      const predictions = outputs['output0'];
      
      if (!predictions || !predictions.data || !predictions.dims) {
        console.warn('Formato de saída inválido do modelo');
        return null;
      }
      
      const data = predictions.data as Float32Array;
      const dims = predictions.dims;
      
      console.log('Output dims:', dims);
      console.log('Output data length:', data.length);
      
      // YOLOv8 geralmente retorna [1, 84, 8400] ou [1, num_classes+4, num_detections]
      // onde 84 = 4 (bbox) + 80 (classes COCO)
      
      // Se o formato for [1, 84, 8400], processar diretamente
      if (dims.length === 3 && dims[0] === 1) {
        const numBoxes = dims[2];
        const numAttrs = dims[1];
        
        console.log('🔍 Processando detecções... numBoxes:', numBoxes, 'numAttrs:', numAttrs);
        
        const detections: YOLOPrediction[] = [];
        let maxScoreFound = 0;
        
        // Iterar sobre cada box
        for (let i = 0; i < numBoxes; i++) {
          // Pegar as coordenadas da bbox (primeiros 4 valores)
          const x = data[i];
          const y = data[numBoxes + i];
          const w = data[2 * numBoxes + i];
          const h = data[3 * numBoxes + i];
          
          // Pegar as probabilidades de classe (do índice 4 em diante)
          const classScores: number[] = [];
          let maxScore = 0;
          let maxIndex = 0;
          
          for (let j = 4; j < numAttrs; j++) {
            const score = data[j * numBoxes + i];
            classScores.push(score);
            if (score > maxScore) {
              maxScore = score;
              maxIndex = j - 4;
            }
          }
          
          // Rastrear o maior score encontrado
          if (maxScore > maxScoreFound) {
            maxScoreFound = maxScore;
          }
          
          // Filtrar por confiança (threshold reduzido para debug)
          if (maxScore > 0.25) {
            detections.push({
              label: maxIndex,
              confidence: maxScore,
              bbox: [x, y, w, h]
            });
          }
        }
        
        console.log('📊 Maior confiança encontrada:', maxScoreFound.toFixed(3));
        console.log('📦 Detecções encontradas (>0.25):', detections.length);
        
        // Ordenar por confiança
        detections.sort((a, b) => b.confidence - a.confidence);
        
        // Pegar a melhor detecção
        const bestDetection = detections[0];
        
        if (bestDetection) {
          console.log('✅ Melhor detecção:', {
            label: bestDetection.label,
            confidence: bestDetection.confidence,
            bbox: bestDetection.bbox
          });
          
          const [x, y, w, h] = bestDetection.bbox;
          
          // Converter de coordenadas normalizadas para pixels
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          return {
            species: `Ave detectada (${(bestDetection.confidence * 100).toFixed(0)}%)`,
            confidence: bestDetection.confidence,
            bbox: {
              x: (x - w / 2) * videoWidth / canvas.width,
              y: (y - h / 2) * videoHeight / canvas.height,
              width: w * videoWidth / canvas.width,
              height: h * videoHeight / canvas.height
            }
          };
        } else {
          console.log('❌ Nenhuma detecção com confiança suficiente');
        }
      }

      return null;
    } catch (err) {
      console.error('Erro ao processar frame:', err);
      return null;
    } finally {
      processingRef.current = false;
    }
  };

  const startDetection = (
    video: HTMLVideoElement,
    onDetection: (detection: BirdDetection) => void
  ) => {
    let isRunning = true;
    
    const detect = async () => {
      if (!isRunning) return;
      
      const detection = await processFrame(video);
      if (detection && isRunning) {
        onDetection(detection);
      }
      
      // Usar setTimeout em vez de requestAnimationFrame para melhor controle
      if (isRunning) {
        frameRef.current = requestAnimationFrame(() => detect());
      }
    };

    detect();
    
    // Retornar função de cleanup
    return () => {
      isRunning = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  };

  const stopDetection = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  };

  return {
    isLoading,
    error,
    startDetection,
    stopDetection
  };
}