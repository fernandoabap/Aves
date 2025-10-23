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
  const [isVideoReady, setIsVideoReady] = useState(false);
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
  const lastCaptureTimeRef = useRef<number>(0);
  const detectionCountRef = useRef<number>(0);
  const { user } = useAuth();
  const { isLoading: isModelLoading, error: modelError, startDetection, stopDetection } = useBirdDetection();

  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      try {
        console.log('Iniciando câmera...');
        
        // Configurações básicas
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        };

        console.log('Solicitando acesso à câmera...');
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Stream obtido com sucesso!');
        
        if (!mounted) {
          console.log('Componente desmontado, parando stream');
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setStream(mediaStream);
        
        // Configurar o elemento de vídeo de forma mais simples
        if (videoRef.current && mounted) {
          const video = videoRef.current;
          console.log('Configurando elemento de vídeo');
          video.srcObject = mediaStream;
          
          // Forçar reprodução imediata
          video.play()
            .then(() => {
              console.log('✅ Vídeo reproduzindo!');
              if (mounted) {
                setIsVideoReady(true);
                setError("");
              }
            })
            .catch((err) => {
              console.error('❌ Erro ao reproduzir:', err);
              // Tentar novamente após um pequeno delay
              setTimeout(() => {
                if (mounted && video.srcObject) {
                  console.log('Tentando reproduzir novamente...');
                  video.play()
                    .then(() => {
                      console.log('✅ Vídeo reproduzindo (2ª tentativa)!');
                      if (mounted) {
                        setIsVideoReady(true);
                        setError("");
                      }
                    })
                    .catch((retryErr) => {
                      console.error('❌ Erro na 2ª tentativa:', retryErr);
                      if (mounted) {
                        setError('Erro ao reproduzir o vídeo. Clique no vídeo para tentar novamente.');
                      }
                    });
                }
              }, 500);
            });
        }

        setError("");
      } catch (err) {
        console.error("Erro ao acessar câmera:", err);
        if (!mounted) return;
        
        const error = err as { name?: string; message?: string };
        let errorMessage = "Erro ao acessar a câmera.";
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = "Permissão negada. Por favor, permita o acesso à câmera.";
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = "Nenhuma câmera encontrada no dispositivo.";
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = "Câmera está sendo usada por outro aplicativo.";
        } else if (error.message) {
          errorMessage = `Erro: ${error.message}`;
        }
        
        console.error('Mensagem de erro:', errorMessage);
        setError(errorMessage);
      } finally {
        if (mounted) {
          console.log('Finalizando inicialização');
          setIsInitializing(false);
        }
      }
    };

    initCamera();

    return () => {
      console.log('Limpando componente');
      mounted = false;
      stopDetection();
      if (stream) {
        stream.getTracks().forEach(track => {
          console.log('Parando track:', track.label);
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
      
      // Log todas as detecções para debug
      console.log('🐦 Detecção:', detection.species, 'Confiança:', (detection.confidence * 100).toFixed(1) + '%');
      
      // Captura automática quando detectar uma ave com alta confiança
      // e não tiver capturado recentemente (mínimo 10 segundos entre capturas)
      const timeSinceLastCapture = now - lastCaptureTimeRef.current;
      const shouldCapture = detection.confidence > 0.5 && timeSinceLastCapture > 10000 && !isCapturing;
      
      console.log('Verificação captura:', {
        confianca: detection.confidence,
        confiancaOk: detection.confidence > 0.5,
        tempoDesdeUltimaCaptura: (timeSinceLastCapture / 1000).toFixed(1) + 's',
        tempoOk: timeSinceLastCapture > 10000,
        estáCapturando: isCapturing,
        deviaCapturar: shouldCapture
      });
      
      if (shouldCapture) {
        console.log('🎯 CAPTURANDO AUTOMATICAMENTE!', detection.species, detection.confidence);
        lastCaptureTimeRef.current = now;
        captureImage(true); // true indica captura automática
      }
      
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
  }, [isModelLoading, modelError, isInitializing, startDetection, stopDetection, isCapturing, user]);

  const captureImage = async (isAutomatic = false) => {
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
      
      if (isAutomatic) {
        toast.success("🎯 Ave detectada! Imagem capturada automaticamente!");
      } else {
        toast.success("Imagem capturada e enviada com sucesso!");
      }
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
      <div className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Inicializando câmera...</p>
        <p className="text-xs text-muted-foreground">Permita o acesso quando solicitado</p>
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
            style={{ backgroundColor: '#000' }}
            onClick={() => {
              // Permitir que o usuário force a reprodução clicando
              if (videoRef.current && !isVideoReady) {
                console.log('👆 Clique detectado, tentando reproduzir...');
                videoRef.current.play()
                  .then(() => {
                    console.log('✅ Reproduzindo após clique!');
                    setIsVideoReady(true);
                    setError("");
                  })
                  .catch((err) => console.error('❌ Erro ao reproduzir após clique:', err));
              }
            }}
          />
          
          {/* Indicador de carregamento do vídeo - simplificado */}
          {!isVideoReady && !error && !isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 cursor-pointer"
                 onClick={() => {
                   if (videoRef.current) {
                     console.log('👆 Clique no overlay, tentando reproduzir...');
                     videoRef.current.play()
                       .then(() => {
                         console.log('✅ Reproduzindo!');
                         setIsVideoReady(true);
                       })
                       .catch((err) => console.error('❌ Erro:', err));
                   }
                 }}>
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-sm font-medium">Iniciando transmissão...</p>
                <p className="text-xs text-gray-400 mt-2">Clique aqui se não iniciar</p>
              </div>
            </div>
          )}
            
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

          {/* Loading do modelo */}
          {isModelLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <p className="text-primary">Carregando modelo de detecção...</p>
            </div>
          )}

          {/* Indicador de captura automática ativa */}
          {!isModelLoading && isVideoReady && (
            <div className="absolute top-4 left-4 space-y-2">
              <div className="bg-green-500/90 text-white px-3 py-2 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Captura Automática Ativa</span>
              </div>
              {currentBird && (
                <div className="bg-blue-500/90 text-white px-3 py-2 rounded-lg text-sm">
                  Última: {currentBird.species} ({(currentBird.confidence * 100).toFixed(0)}%)
                </div>
              )}
            </div>
          )}

          {/* Botão de captura */}
          <div className="absolute bottom-4 right-4">
            <Button
              onClick={() => captureImage(false)}
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
    </div>
  );
};

export default memo(LiveCamera);