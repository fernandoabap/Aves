import { processImage } from './services/birdDetection';
import path from 'path';

const testImages = [
    // Imagem de um pássaro
    'c:/Users/fe-gu/Documents/Vscode/aves/feather-watch-hub/src/assets/bird-sample-1.jpg',
    // Imagem com múltiplos objetos incluindo pássaros
    'c:/Users/fe-gu/Documents/Vscode/aves/feather-watch-hub/src/assets/bird-sample-2.jpg'
];

async function runTests() {
    console.log('Iniciando testes de detecção...\n');
    
    for (const [index, imageUrl] of testImages.entries()) {
        console.log(`\nTeste ${index + 1}: ${imageUrl}`);
        console.log('-'.repeat(50));
        
        try {
            const results = await processImage(imageUrl);
            
            if (results.length > 0) {
                console.log('Detecções encontradas:');
                results.forEach((detection, i) => {
                    console.log(`\nDetecção ${i + 1}:`);
                    console.log(`Espécie: ${detection.species}`);
                    console.log(`Confiança: ${(detection.confidence * 100).toFixed(2)}%`);
                    console.log(`Posição: x=${detection.boundingBox.x.toFixed(2)}, y=${detection.boundingBox.y.toFixed(2)}`);
                    console.log(`Tamanho: ${detection.boundingBox.width.toFixed(2)}x${detection.boundingBox.height.toFixed(2)}`);
                });
            } else {
                console.log('Nenhuma ave detectada nesta imagem.');
            }
        } catch (error) {
            console.error(`Erro ao processar imagem ${index + 1}:`, error);
        }
    }
}

console.log('Verificando ambiente...');
console.log('Modelo ONNX:', path.resolve(__dirname, '../public/models/birds-yolov8.onnx'));
runTests();