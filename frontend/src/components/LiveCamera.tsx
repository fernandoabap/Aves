import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Bird } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth.context";
import { captureService } from "@/services/capture.service";
import { useBirdDetection } from "@/hooks/use-bird-detection";
import { Card } from "@/components/ui/card";

const LiveCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentBird, setCurrentBird] = useState<{
    species: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const detectionCountRef = useRef<number>(0);
  const { user } = useAuth();
  const { isLoading: isModelLoading, error: modelError, startDetection, stopDetection } = useBirdDetection();

  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      try {
        // Configurações básicas
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Configurar o elemento de vídeo de forma simples
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = mediaStream;
          
          // Garantir que o vídeo comece a reproduzir
          try {
            await video.play();
            console.log('Vídeo iniciado com sucesso');
          } catch (err) {
            console.error('Erro ao reproduzir vídeo:', err);
            // Tentar novamente após carregar metadados
            video.onloadedmetadata = async () => {
              try {
                await video.play();
                console.log('Vídeo iniciado após loadedmetadata');
              } catch (playErr) {
                console.error('Erro ao reproduzir após metadata:', playErr);
              }
            };
          }
        }

        setStream(mediaStream);
        setError("");
      } catch (err) {
        console.error("Error accessing camera:", err);
        if (!mounted) return;
        
        const error = err as { name?: string; message?: string };
        let errorMessage = "Erro ao acessar a câmera.";
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = "Permissão negada. Por favor, permita o acesso à câmera.";
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = "Nenhuma câmera encontrada no dispositivo.";
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = "Câmera está sendo usada por outro aplicativo.";
        }
        
        setError(errorMessage);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      stopDetection();
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || isModelLoading || modelError || isInitializing) return;

    const handleBirdDetection = (detection: { 
      species: string; 
      confidence: number; 
      bbox: { x: number; y: number; width: number; height: number; }
    }) => {
      const now = Date.now();
      detectionCountRef.current++;
      
      // Limitar atualizações visuais para evitar flickering
      // Atualizar no máximo a cada 500ms
      if (now - lastDetectionTimeRef.current < 500) {
        return;
      }
      
      lastDetectionTimeRef.current = now;
      
      // Usar requestAnimationFrame para sincronizar com o repaint do navegador
      requestAnimationFrame(() => {
        setCurrentBird(prev => {
          // Se não há detecção anterior, usar a nova
          if (!prev) return detection;
          
          // Se a confiança for muito baixa, manter a anterior por mais tempo
          if (detection.confidence < 0.5) return prev;
          
          // Se a nova detecção for significativamente melhor, atualizar
          if (detection.confidence > prev.confidence + 0.2) {
            return detection;
          }
          
          // Suavizar MUITO a transição das coordenadas para reduzir tremulação
          return {
            species: detection.species,
            confidence: detection.confidence,
            bbox: {
              x: prev.bbox.x * 0.8 + detection.bbox.x * 0.2,
              y: prev.bbox.y * 0.8 + detection.bbox.y * 0.2,
              width: prev.bbox.width * 0.8 + detection.bbox.width * 0.2,
              height: prev.bbox.height * 0.8 + detection.bbox.height * 0.2
            }
          };
        });
      });
    };

    const cleanup = startDetection(videoRef.current, handleBirdDetection);

    return () => {
      if (cleanup) cleanup();
      stopDetection();
    };
  }, [isModelLoading, modelError, isInitializing, startDetection, stopDetection]);

  const captureImage = async () => {
    if (!videoRef.current || !user) return;

    setIsCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) return;

    try {
      context.drawImage(videoRef.current, 0, 0);
      
      // Converter o canvas para um blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, "image/jpeg", 0.95);
      });

      // Criar um arquivo com o blob
      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Fazer upload da imagem
      await captureService.uploadImage(file, user.id);
      
      toast.success("Imagem capturada e enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao capturar imagem:", err);
      toast.error("Erro ao capturar imagem");
    } finally {
      setIsCapturing(false);
    }
  };

  if (error) {
    return (
      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Inicializando câmera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <div className="relative w-full aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
            
            {/* Overlay para detecção */}
            <div 
              ref={overlayRef} 
              className="absolute inset-0 pointer-events-none"
            >
              {currentBird && (
                <>
                  {/* Bounding box */}
                  <div
                    className="absolute border-2 border-primary rounded-lg"
                    style={{
                      left: `${currentBird.bbox.x}px`,
                      top: `${currentBird.bbox.y}px`,
                      width: `${currentBird.bbox.width}px`,
                      height: `${currentBird.bbox.height}px`
                    }}
                  />
                  
                  {/* Informações da detecção */}
                  <Card 
                    className="absolute p-2 bg-background/80 backdrop-blur-sm border border-primary"
                    style={{
                      left: `${currentBird.bbox.x}px`,
                      top: `${currentBird.bbox.y - 60}px`,
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Bird className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{currentBird.species}</p>
                        <p className="text-xs text-muted-foreground">
                          Confiança: {Math.round(currentBird.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>        {/* Loading do modelo */}
        {isModelLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <p className="text-primary">Carregando modelo de detecção...</p>
          </div>
        )}

        {/* Botão de captura */}
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={captureImage}
            size="lg"
            className="bg-primary hover:bg-primary/90"
            disabled={isCapturing || isModelLoading}
          >
            <Camera className="h-5 w-5 mr-2" />
            {isCapturing ? "Capturando..." : "Capturar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default memo(LiveCamera);