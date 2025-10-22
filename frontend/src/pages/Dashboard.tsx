import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bird, Eye, Camera, TrendingUp, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import LiveCamera from "@/components/LiveCamera";
import { useAuth } from "@/contexts/auth.context";
import { captureService, Capture } from "@/services/capture.service";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import birdSample1 from "@/assets/bird-sample-1.jpg.ts";
import birdSample2 from "@/assets/bird-sample-2.jpg.ts";
import birdSample3 from "@/assets/bird-sample-3.jpg.ts";

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentCaptures, setRecentCaptures] = useState<Capture[]>([]);
  const [dailyStats, setDailyStats] = useState<{ date: string; count: number }[]>([]);
  const [topSpecies, setTopSpecies] = useState<{ species: string; count: number }[]>([]);
  const [userStats, setUserStats] = useState<{
    total_captures: number;
    total_species: number;
    avg_confidence: number;
    last_capture_date: string;
  } | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Carregar todos os dados em paralelo
        const [captures, daily, species, stats] = await Promise.all([
          captureService.getRecentCaptures(user.id),
          captureService.getDailyStats(user.id),
          captureService.getTopSpecies(user.id),
          captureService.getUserStats(user.id)
        ]);

        setRecentCaptures(captures);
        setDailyStats(daily);
        setTopSpecies(species);
        setUserStats(stats);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const stats = [
    {
      icon: Bird,
      label: "Espécies Detectadas",
      value: userStats?.total_species?.toString() || "0",
      change: topSpecies[0]?.species || "Nenhuma espécie",
      color: "text-primary",
    },
    {
      icon: Eye,
      label: "Taxa de Precisão",
      value: userStats?.avg_confidence ? `${Math.round(userStats.avg_confidence)}%` : "0%",
      change: "média geral",
      color: "text-secondary",
    },
    {
      icon: Camera,
      label: "Total de Capturas",
      value: userStats?.total_captures?.toString() || "0",
      change: dailyStats[dailyStats.length - 1]?.count + " hoje",
      color: "text-accent",
    },
    {
      icon: TrendingUp,
      label: "Última Captura",
      value: userStats?.last_capture_date 
        ? formatDistanceToNow(new Date(userStats.last_capture_date), { 
            locale: ptBR, 
            addSuffix: true 
          })
        : "Nenhuma",
      change: "última atividade",
      color: "text-primary",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-primary font-medium">{stat.change}</span> desde ontem
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Live Feed */}
          <Card className="lg:col-span-2 shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent animate-pulse"></div>
                Feed ao Vivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveCamera />
            </CardContent>
          </Card>

          {/* Recent Detections */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Detecções Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : recentCaptures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma captura recente
                  </div>
                ) : (
                  recentCaptures.map((capture) => {
                    const detection = capture.bird_detections?.[0];
                    return (
                      <div
                        key={capture.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src={capture.image_url}
                          alt={detection?.species_name || "Captura"}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {detection?.species_name || "Espécie não identificada"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(capture.created_at), {
                              locale: ptBR,
                              addSuffix: true
                            })}
                          </p>
                          {detection && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="h-1.5 rounded-full bg-muted w-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-nature"
                                  style={{ width: `${detection.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {Math.round(detection.confidence)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gallery Preview */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Galeria - Últimas Capturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[birdSample1, birdSample2, birdSample3, birdSample1, birdSample2, birdSample3].map(
                (img, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer shadow-soft"
                  >
                    <img src={img} alt={`Bird ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;