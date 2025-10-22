import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Search, MapPin, Cloud, Loader2, Calendar, Clock } from "lucide-react";
import { captureService, Capture } from "@/services/capture.service";
import { useAuth } from "@/contexts/auth.context";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const History = () => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const loadCaptures = async () => {
      try {
        if (!user?.id) return;
        setLoading(true);
        const { data } = await captureService.getCaptures(user.id, 1, 50); // Buscar mais capturas
        const processedData = data.map(capture => {
          const detection = capture.bird_detections && capture.bird_detections.length > 0 
            ? capture.bird_detections[0] 
            : null;
          
          return {
            ...capture,
            metadata: {
              ...capture.metadata,
              species: detection?.species_name || capture.metadata?.species || "Espécie não identificada",
              confidence: detection?.confidence || capture.metadata?.confidence,
            }
          };
        });
        setCaptures(processedData);
      } catch (error) {
        console.error("Erro ao carregar capturas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCaptures();
  }, [user?.id]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Histórico de Observações</h1>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar espécie..." 
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
        ) : captures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma captura encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {captures
              .filter(capture => 
                !searchTerm || 
                capture.metadata?.species?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((capture) => {
                const captureDate = new Date(capture.created_at);
                const formattedDate = format(captureDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                const formattedTime = format(captureDate, "HH:mm", { locale: ptBR });
                const species = capture.metadata?.species || "Espécie não identificada";

                return (
                  <Card key={capture.id} className="shadow-soft hover:shadow-medium transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="relative h-32 w-full sm:w-32 rounded-lg overflow-hidden">
                          <img
                            src={capture.image_url}
                            alt={species}
                            className="h-full w-full object-cover shadow-soft"
                          />
                          {capture.status === 'pending' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-semibold">{species}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{formattedTime}</span>
                                </div>
                              </div>
                            </div>
                            {capture.metadata?.confidence && (
                              <Badge variant="secondary" className="text-xs">
                                Confiança: {(capture.metadata.confidence * 100).toFixed(1)}%
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {capture.metadata?.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{capture.metadata.location}</span>
                              </div>
                            )}
                            {capture.metadata?.weather && (
                              <div className="flex items-center gap-2">
                                <Cloud className="h-4 w-4 text-muted-foreground" />
                                <span>{capture.metadata.weather}</span>
                              </div>
                            )}
                            {capture.metadata?.temperature && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Temp:</span>
                                <span>{capture.metadata.temperature}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default History;