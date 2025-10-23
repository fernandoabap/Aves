import { supabase } from './supabase';

export interface Capture {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url?: string;
  created_at: string;
  location?: { x: number; y: number };
  confidence?: number;
  status: 'pending' | 'processed' | 'failed';
  metadata: Record<string, any>;
  bird_detections?: BirdDetection[];
}

export interface BirdDetection {
  id: string;
  capture_id: string;
  species_name: string;
  confidence: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_at: string;
  metadata: Record<string, any>;
}

export const captureService = {
  async uploadImage(file: File, userId: string): Promise<Capture> {
    try {
      // Gerar um nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Fazer upload do arquivo para o Storage do Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bird-images')
        .upload(filePath, file, {
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Erro ao fazer upload da imagem: ' + uploadError.message);
      }

      // Obter URL pública
      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('bird-images')
        .getPublicUrl(filePath);

    // Salvar os dados da captura no banco
    const { data: capture, error: insertError } = await supabase
      .from('captures')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        status: 'processed',
        metadata: {
          original_name: file.name,
          size: file.size,
          type: file.type,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Se houver erro na inserção, tenta deletar a imagem para não deixar órfã
      await supabase.storage
        .from('bird-images')
        .remove([`${userId}/${fileName}`]);
      
      throw new Error('Erro ao salvar captura: ' + insertError.message);
    }

    return capture;
    
    } catch (error) {
      console.error('Upload process error:', error);
      throw error;
    }
  },

  async getCaptures(userId: string, page = 1, limit = 10): Promise<{ data: Capture[]; count: number }> {
    console.log('Buscando capturas com parâmetros:', { userId, page, limit });
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      // Verificar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sem sessão ativa');
      }

      const { data, error, count } = await supabase
        .from('captures')
        .select(`
          *,
          bird_detections (
            id,
            species_name,
            confidence,
            bounding_box,
            created_at,
            metadata
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Erro na query do Supabase:', error);
        throw new Error('Erro ao buscar capturas: ' + error.message);
      }

      if (!data) {
        console.log('Nenhum dado encontrado');
        return { data: [], count: 0 };
      }

      console.log(`Encontradas ${data.length} capturas`);
      
      const captures = data.map(capture => {
        const firstDetection = capture.bird_detections?.[0];
        return {
          ...capture,
          metadata: {
            ...capture.metadata,
            species: firstDetection?.species_name || capture.metadata?.species || 'Espécie não identificada',
            confidence: firstDetection?.confidence || capture.metadata?.confidence || 0,
          }
        };
      });

      return { data: captures, count: count || 0 };
    } catch (error) {
      console.error('Erro ao buscar capturas:', error);
      throw error;
    }
  },

  async getDetections(captureId: string): Promise<BirdDetection[]> {
    const { data, error } = await supabase
      .from('bird_detections')
      .select('*')
      .eq('capture_id', captureId)
      .order('confidence', { ascending: false });

    if (error) {
      throw new Error('Erro ao buscar detecções: ' + error.message);
    }

    return data || [];
  },

  async deleteCapture(captureId: string, userId: string): Promise<void> {
    try {
      // Primeiro, buscar a URL da imagem para deletar do storage
      const { data: capture, error: fetchError } = await supabase
        .from('captures')
        .select('image_url')
        .eq('id', captureId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw new Error('Erro ao buscar captura: ' + fetchError.message);
      }

      if (!capture) {
        throw new Error('Captura não encontrada');
      }

      // Extrair o caminho do arquivo da URL
      const imageUrl = capture.image_url;
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'bird-images');
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        
        // Deletar a imagem do storage
        const { error: storageError } = await supabase.storage
          .from('bird-images')
          .remove([filePath]);

        if (storageError) {
          console.error('Erro ao deletar imagem do storage:', storageError);
          // Continua mesmo se falhar ao deletar do storage
        }
      }

      // Deletar o registro do banco (as detecções serão deletadas em cascata)
      const { error: deleteError } = await supabase
        .from('captures')
        .delete()
        .eq('id', captureId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error('Erro ao deletar captura: ' + deleteError.message);
      }
    } catch (error) {
      console.error('Erro ao deletar captura:', error);
      throw error;
    }
  },

  async getUserStats(userId: string): Promise<{
    total_captures: number;
    total_species: number;
    avg_confidence: number;
    last_capture_date: string;
  } | null> {
    console.log('Buscando estatísticas do usuário:', userId);
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_detection_stats', { user_id: userId });

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw new Error('Erro ao buscar estatísticas: ' + error.message);
      }

      console.log('Estatísticas carregadas:', data);
      return data;
    } catch (error) {
      console.error('Erro ao processar estatísticas:', error);
      throw error;
    }
  },

  async getRecentCaptures(userId: string, limit = 5): Promise<Capture[]> {
    console.log('Buscando capturas recentes:', { userId, limit });

    try {
      // Verificar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Sem sessão ativa ao buscar capturas recentes');
        throw new Error('Sem sessão ativa');
      }

      const { data, error } = await supabase
        .from('captures')
        .select(`
          *,
          bird_detections (
            id,
            species_name,
            confidence,
            bounding_box,
            created_at,
            metadata
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro na query de capturas recentes:', error);
        throw new Error('Erro ao buscar capturas recentes: ' + error.message);
      }

      if (!data) {
        console.log('Nenhuma captura recente encontrada');
        return [];
      }

      console.log(`Encontradas ${data.length} capturas recentes`);
      
      return data.map(capture => ({
        ...capture,
        metadata: {
          ...capture.metadata,
          species: capture.bird_detections?.[0]?.species_name || capture.metadata?.species || 'Espécie não identificada',
          confidence: capture.bird_detections?.[0]?.confidence || capture.metadata?.confidence || 0,
        }
      }));
    } catch (error) {
      console.error('Erro ao buscar capturas recentes:', error);
      throw error;
    }
  },

  async getDailyStats(userId: string, days = 7): Promise<{ date: string; count: number }[]> {
    console.log('Buscando estatísticas diárias:', { userId, days });
    
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('captures')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('Erro ao buscar estatísticas diárias:', error);
        throw new Error('Erro ao buscar estatísticas diárias: ' + error.message);
      }

      // Agrupar capturas por dia
      const dailyStats = (data || []).reduce((acc, capture) => {
        const date = new Date(capture.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Preencher todos os dias no intervalo
      const result = [];
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(endDate);
        currentDate.setDate(currentDate.getDate() - i);
        const dateString = currentDate.toISOString().split('T')[0];
        result.unshift({
          date: dateString,
          count: dailyStats[dateString] || 0
        });
      }

      console.log('Estatísticas diárias processadas:', result);
      return result;
    } catch (error) {
      console.error('Erro ao processar estatísticas diárias:', error);
      throw error;
    }
  },
  async getTopSpecies(userId: string, limit = 5): Promise<{ species: string; count: number }[]> {
    console.log('Buscando top espécies:', { userId, limit });
    
    try {
      const { data, error } = await supabase
        .from('captures')
        .select(`
          id,
          bird_detections (
            species_name
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar espécies mais comuns:', error);
        throw new Error('Erro ao buscar espécies mais comuns: ' + error.message);
      }

      // Contar ocorrências de cada espécie
      const speciesCounts = (data || []).reduce((acc, capture) => {
        (capture.bird_detections || []).forEach((detection: any) => {
          if (detection.species_name) {
            acc[detection.species_name] = (acc[detection.species_name] || 0) + 1;
          }
        });
        return acc;
      }, {} as Record<string, number>);

      // Ordenar e limitar resultados
      const result = Object.entries(speciesCounts)
        .map(([species, count]) => ({ species, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      console.log('Top espécies processadas:', result);
      return result;
    } catch (error) {
      console.error('Erro ao processar top espécies:', error);
      throw error;
    }
  }
};