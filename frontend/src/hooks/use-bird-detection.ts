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
      
      // Converter para tensor do ONNX Runtime
      const input = new Float32Array(canvas.width * canvas.height * 3);
      for (let i = 0; i < imageData.data.length / 4; i++) {
        input[i * 3] = imageData.data[i * 4] / 255.0;
        input[i * 3 + 1] = imageData.data[i * 4 + 1] / 255.0;
        input[i * 3 + 2] = imageData.data[i * 4 + 2] / 255.0;
      }
      
      // Criar tensor de entrada
      const inputTensor = new ort.Tensor('float32', input, [1, 3, canvas.height, canvas.width]);
      
      // Fazer a predição
      const outputs = await session.run({ images: inputTensor });
      const predictions = outputs['output0'].data as Float32Array;
      
      // No YOLOv8, o output é um tensor 2D onde cada linha representa uma detecção
      // e as colunas são [x, y, w, h, conf, class_scores...]
      const rowLength = predictions.length / (predictions as any).dims[0];
      const numDetections = (predictions as any).dims[0];
      const numClasses = rowLength - 5;  // 4 para bbox + 1 para conf + classes
      const detections: YOLOPrediction[] = [];
      
      for (let i = 0; i < numDetections; i++) {
        const offset = i * rowLength;
        const confidence = predictions[offset + 4];
        
        if (confidence > 0.5) {  // Limiar de confiança
          const bbox = [
            predictions[offset],     // x
            predictions[offset + 1], // y
            predictions[offset + 2], // w
            predictions[offset + 3]  // h
          ];
          
          // Pegar as probabilidades de classe
          const classScores = Array.from(predictions.slice(offset + 5, offset + 5 + numClasses));
          const classIndex = classScores.indexOf(Math.max(...classScores));
          
          detections.push({
            label: classIndex,
            confidence: confidence,
            bbox: bbox
          });
        }
      }
      
      // Pegar a melhor detecção de ave
      const bestDetection = detections[0];  // Assumindo que as classes são ordenadas por confiança
      
      if (bestDetection) {
        const [x, y, w, h] = bestDetection.bbox;
        return {
          species: 'Ave',  // Você pode mapear o label para nomes específicos de aves
          confidence: bestDetection.confidence,
          bbox: {
            x: x * video.videoWidth,
            y: y * video.videoHeight,
            width: w * video.videoWidth,
            height: h * video.videoHeight
          }
        };
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