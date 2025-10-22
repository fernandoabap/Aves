import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export async function downloadImage(urlOrPath: string): Promise<Buffer> {
  try {
    // Verifica se é um caminho local ou URL
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      // Se for URL, usa axios
      const response = await axios.get(urlOrPath, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data, 'binary');
    } else {
      // Se for caminho local, lê o arquivo diretamente
      return await fs.readFile(path.normalize(urlOrPath));
    }
  } catch (error) {
    console.error('Error loading image:', error);
    throw new Error(`Failed to load image from ${urlOrPath}`);
  }
}