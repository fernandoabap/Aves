import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Search, Loader2 } from "lucide-react";
import { captureService, Capture } from "@/services/capture.service";
import { useAuth } from "@/contexts/auth.context";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [images, setImages] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const loadImages = async () => {
      try {
        if (!user?.id) {
          console.log("Usuário não autenticado ou ID não disponível");
          return;
        }
        
        setLoading(true);
        console.log("Buscando capturas para o usuário:", user.id);
        
        const { data, count } = await captureService.getCaptures(user.id, 1, 50);
        console.log(`Encontradas ${count} capturas no total`);
        
        if (!data || data.length === 0) {
          console.log("Nenhuma captura encontrada");
          setImages([]);
          return;
        }
        
        console.log("Processando dados das capturas...");
        const processedData = data.map(capture => {
          const detection = capture.bird_detections && capture.bird_detections.length > 0 
            ? capture.bird_detections[0] 
            : null;
            
          return {
            ...capture,
            metadata: {
              ...capture.metadata,
              species: detection?.species_name || capture.metadata?.species || "Espécie não identificada",
              confidence: detection?.confidence || capture.metadata?.confidence || 0,
            }
          };
        });
        
        console.log(`Processadas ${processedData.length} capturas com sucesso`);
        setImages(processedData);
        
      } catch (error) {
        console.error("Erro ao carregar imagens:", error);
        if (error instanceof Error) {
          console.error("Detalhes do erro:", error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [user?.id]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Galeria de Fotos</h1>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por espécie..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images
              .filter(image => 
                !searchTerm || 
                image.metadata?.species?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((image) => {
                const captureDate = new Date(image.created_at);
                const formattedDate = format(captureDate, "dd/MM/yyyy", { locale: ptBR });
                const formattedTime = format(captureDate, "HH:mm", { locale: ptBR });
                const species = image.metadata?.species || "Espécie não identificada";

                return (
                  <Card
                    key={image.id}
                    className="overflow-hidden shadow-soft hover:shadow-medium transition-all cursor-pointer group"
                    onClick={() => setSelectedImage(image.id)}
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <img
                        src={image.image_url}
                        alt={species}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {image.status === 'pending' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{species}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formattedDate}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formattedTime}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal for selected image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl w-full space-y-4">
            {/* Image */}
            <img
              src={images.find((img) => img.id === selectedImage)?.image_url}
              alt="Ave capturada"
              className="w-full rounded-lg shadow-large"
            />
            
            {/* Image details */}
            {images.find((img) => img.id === selectedImage) && (
              <div className="bg-white p-4 rounded-lg shadow-large space-y-2">
                <h3 className="font-semibold">
                  {images.find((img) => img.id === selectedImage)?.metadata?.species || "Espécie não identificada"}
                </h3>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Capturada em: {
                      format(
                        new Date(images.find((img) => img.id === selectedImage)?.created_at || ""),
                        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )
                    }
                  </span>
                  {images.find((img) => img.id === selectedImage)?.metadata?.confidence && (
                    <Badge variant="secondary">
                      Confiança: {(images.find((img) => img.id === selectedImage)?.metadata?.confidence * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Gallery;