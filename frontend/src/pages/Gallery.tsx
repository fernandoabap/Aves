import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import birdSample1 from "@/assets/bird-sample-1.jpg";
import birdSample2 from "@/assets/bird-sample-2.jpg";
import birdSample3 from "@/assets/bird-sample-3.jpg";

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const images = [
    {
      id: 1,
      src: birdSample1,
      species: "Tucano-de-bico-verde",
      date: "2025-10-22",
      time: "09:45",
    },
    {
      id: 2,
      src: birdSample2,
      species: "Beija-flor-de-garganta-verde",
      date: "2025-10-22",
      time: "10:23",
    },
    {
      id: 3,
      src: birdSample3,
      species: "Águia-pescadora",
      date: "2025-10-22",
      time: "08:12",
    },
    {
      id: 4,
      src: birdSample1,
      species: "Tucano-de-bico-verde",
      date: "2025-10-21",
      time: "14:15",
    },
    {
      id: 5,
      src: birdSample2,
      species: "Beija-flor-de-garganta-verde",
      date: "2025-10-21",
      time: "16:30",
    },
    {
      id: 6,
      src: birdSample3,
      species: "Águia-pescadora",
      date: "2025-10-21",
      time: "11:20",
    },
    {
      id: 7,
      src: birdSample1,
      species: "Tucano-de-bico-verde",
      date: "2025-10-20",
      time: "15:45",
    },
    {
      id: 8,
      src: birdSample2,
      species: "Beija-flor-de-garganta-verde",
      date: "2025-10-20",
      time: "09:10",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Galeria de Fotos</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por espécie..." className="pl-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => (
            <Card
              key={image.id}
              className="overflow-hidden shadow-soft hover:shadow-medium transition-all cursor-pointer group"
              onClick={() => setSelectedImage(image.id)}
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={image.src}
                  alt={image.species}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm line-clamp-1">{image.species}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{image.date}</span>
                  <Badge variant="secondary" className="text-xs">
                    {image.time}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal for selected image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl w-full">
            <img
              src={images.find((img) => img.id === selectedImage)?.src}
              alt="Selected bird"
              className="w-full rounded-lg shadow-large"
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Gallery;