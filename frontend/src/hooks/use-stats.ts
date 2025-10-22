import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth.context';
import { captureService } from '@/services/capture.service';

interface Stats {
  totalCaptures: number;
  totalSpecies: number;
  avgConfidence: number;
  dailyStats: { day: string; detections: number }[];
  topSpecies: { name: string; count: number }[];
  locationData: { name: string; value: number }[];
  isLoading: boolean;
  error: string | null;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCaptures: 0,
    totalSpecies: 0,
    avgConfidence: 0,
    dailyStats: [],
    topSpecies: [],
    locationData: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return;

      try {
        // Load general stats
        const userStats = await captureService.getUserStats(user.id);
        
        // Load daily stats for the last 7 days
        const dailyData = await captureService.getDailyStats(user.id, 7);
        
        // Load top species
        const speciesData = await captureService.getTopSpecies(user.id, 5);

        // Format daily stats
        const formattedDailyStats = dailyData.map(stat => ({
          day: new Date(stat.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
          detections: stat.count,
        }));

        // Format species data
        const formattedSpeciesData = speciesData.map(species => ({
          name: species.species,
          count: species.count,
        }));

        // For now, we'll keep location data static until we implement location tracking
        const locationData = [
          { name: "Jardim Principal", value: 35 },
          { name: "Área de Alimentação", value: 25 },
          { name: "Lago Norte", value: 20 },
          { name: "Trilha Sul", value: 20 },
        ];

        setStats({
          totalCaptures: userStats?.total_captures || 0,
          totalSpecies: userStats?.total_species || 0,
          avgConfidence: userStats?.avg_confidence || 0,
          dailyStats: formattedDailyStats,
          topSpecies: formattedSpeciesData,
          locationData,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erro ao carregar estatísticas',
        }));
      }
    }

    loadStats();
  }, [user?.id]);

  return stats;
}