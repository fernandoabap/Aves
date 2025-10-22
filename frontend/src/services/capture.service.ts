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
        status: 'pending',
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('captures')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error('Erro ao buscar capturas: ' + error.message);
    }

    return { data: data || [], count: count || 0 };
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

  async deleteCapture(captureId: string): Promise<void> {
    const { error } = await supabase
      .from('captures')
      .delete()
      .eq('id', captureId);

    if (error) {
      throw new Error('Erro ao deletar captura: ' + error.message);
    }
  },

  async getUserStats(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_detection_stats', { user_id: userId });

    if (error) {
      throw new Error('Erro ao buscar estatísticas: ' + error.message);
    }

    return data;
  },

  async getRecentCaptures(userId: string, limit = 5): Promise<Capture[]> {
    const { data, error } = await supabase
      .from('captures')
      .select(`
        *,
        bird_detections (
          species_name,
          confidence
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Erro ao buscar capturas recentes: ' + error.message);
    }

    return data || [];
  },

  async getDailyStats(userId: string, days = 7): Promise<{ date: string; count: number }[]> {
    const { data, error } = await supabase
      .from('captures')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      throw new Error('Erro ao buscar estatísticas diárias: ' + error.message);
    }

    const dailyStats = (data || []).reduce((acc, capture) => {
      const date = new Date(capture.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Preencher dias sem capturas com 0
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      result.unshift({
        date,
        count: dailyStats[date] || 0
      });
    }

    return result;
  },

  async getTopSpecies(userId: string, limit = 5): Promise<{ species: string; count: number }[]> {
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
      throw new Error('Erro ao buscar espécies mais comuns: ' + error.message);
    }

    const speciesCounts = (data || []).reduce((acc, capture) => {
      (capture.bird_detections || []).forEach((detection: any) => {
        if (detection.species_name) {
          acc[detection.species_name] = (acc[detection.species_name] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(speciesCounts)
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
};