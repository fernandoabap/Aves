import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Search, MapPin, Cloud } from "lucide-react";
import birdSample1 from "@/assets/bird-sample-1.jpg";
import birdSample2 from "@/assets/bird-sample-2.jpg";
import birdSample3 from "@/assets/bird-sample-3.jpg";

const History = () => {
  const observations = [
    {
      id: 1,
      species: "Beija-flor-de-garganta-verde",
      date: "2025-10-22",
      time: "10:23",
      image: birdSample2,
      location: "Jardim Principal",
      weather: "Ensolarado",
      temperature: "24°C",
      confidence: 95,
    },
    {
      id: 2,
      species: "Tucano-de-bico-verde",
      date: "2025-10-22",
      time: "09:45",
      image: birdSample1,
      location: "Área de Alimentação",
      weather: "Parcialmente nublado",
      temperature: "22°C",
      confidence: 92,
    },
    {
      id: 3,
      species: "Águia-pescadora",
      date: "2025-10-22",
      time: "08:12",
      image: birdSample3,
      location: "Lago Norte",
      weather: "Ensolarado",
      temperature: "21°C",
      confidence: 88,
    },
    {
      id: 4,
      species: "Beija-flor-de-garganta-verde",
      date: "2025-10-21",
      time: "16:30",
      image: birdSample2,
      location: "Jardim Principal",
      weather: "Nublado",
      temperature: "20°C",
      confidence: 93,
    },
    {
      id: 5,
      species: "Tucano-de-bico-verde",
      date: "2025-10-21",
      time: "14:15",
      image: birdSample1,
      location: "Trilha Sul",
      weather: "Ensolarado",
      temperature: "26°C",
      confidence: 90,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Histórico de Observações</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar espécie..." className="pl-9" />
          </div>
        </div>

        <div className="space-y-4">
          {observations.map((obs) => (
            <Card key={obs.id} className="shadow-soft hover:shadow-medium transition-all">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <img
                    src={obs.image}
                    alt={obs.species}
                    className="h-32 w-32 rounded-lg object-cover shadow-soft"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{obs.species}</h3>
                        <p className="text-sm text-muted-foreground">
                          {obs.date} às {obs.time}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Confiança: {obs.confidence}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{obs.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                        <span>{obs.weather}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Temp:</span>
                        <span>{obs.temperature}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default History;