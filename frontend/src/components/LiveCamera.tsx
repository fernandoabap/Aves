import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth.context";
import { captureService } from "@/services/capture.service";

const LiveCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment",
          },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError("");
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Erro ao acessar a câmera. Verifique as permissões.");
      } finally {
        setIsInitializing(false);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full rounded-lg"
      />
      <div className="absolute bottom-4 right-4">
        <Button
          onClick={captureImage}
          size="lg"
          className="bg-primary hover:bg-primary/90"
          disabled={isCapturing}
        >
          <Camera className="h-5 w-5 mr-2" />
          {isCapturing ? "Capturando..." : "Capturar"}
        </Button>
      </div>
    </div>
  );
};

export default LiveCamera;