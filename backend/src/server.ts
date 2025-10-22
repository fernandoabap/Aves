import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { processImage } from './services/birdDetection';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Webhook para processar novas capturas
app.post('/webhook/process-capture', async (req, res) => {
  try {
    const { record } = req.body;
    
    if (!record?.id || !record?.image_url) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Processar a imagem com o modelo de IA
    const detections = await processImage(record.image_url);

    // Salvar detecções no banco
    const { error } = await supabase
      .from('bird_detections')
      .insert(
        detections.map(detection => ({
          capture_id: record.id,
          species_name: detection.species,
          confidence: detection.confidence,
          bounding_box: detection.boundingBox,
          metadata: detection.metadata
        }))
      );

    if (error) {
      throw error;
    }

    // Atualizar status da captura
    await supabase
      .from('captures')
      .update({ status: 'processed' })
      .eq('id', record.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao processar captura:', error);
    res.status(500).json({ error: 'Erro ao processar captura' });
  }
});

const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});