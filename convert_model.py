from ultralytics import YOLO

# Carregar o modelo YOLOv8
model = YOLO('yolov8n.pt')

# Exportar para ONNX
model.export(format='onnx', 
            imgsz=640,  # Tamanho da imagem de entrada
            simplify=True,  # Simplificar o modelo
            opset=12,  # Versão do ONNX
            )