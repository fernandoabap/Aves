interface BirdSpecies {
  name: string;
  scientificName: string;
  commonNames: string[];
  keywords: string[];
}

export const birdSpecies: BirdSpecies[] = [
  {
    name: 'Sabiá-laranjeira',
    scientificName: 'Turdus rufiventris',
    commonNames: ['Rufous-bellied Thrush', 'Sabiá', 'Sabiá-laranjeira'],
    keywords: ['thrush', 'turdus', 'sabia']
  },
  {
    name: 'Bem-te-vi',
    scientificName: 'Pitangus sulphuratus',
    commonNames: ['Great Kiskadee', 'Bem-te-vi', 'Bentevi'],
    keywords: ['kiskadee', 'flycatcher', 'bentevi']
  },
  {
    name: 'João-de-barro',
    scientificName: 'Furnarius rufus',
    commonNames: ['Rufous Hornero', 'João-de-barro', 'Hornero'],
    keywords: ['hornero', 'ovenbird', 'joao']
  },
  {
    name: 'Pardal',
    scientificName: 'Passer domesticus',
    commonNames: ['House Sparrow', 'Pardal'],
    keywords: ['sparrow', 'finch', 'pardal']
  },
  {
    name: 'Canário-da-terra',
    scientificName: 'Sicalis flaveola',
    commonNames: ['Saffron Finch', 'Canário-da-terra'],
    keywords: ['finch', 'canary', 'saffron']
  },
  {
    name: 'Beija-flor',
    scientificName: 'Trochilidae',
    commonNames: ['Hummingbird', 'Beija-flor', 'Colibri'],
    keywords: ['hummingbird', 'colibri', 'beijaflor']
  },
  {
    name: 'Rolinha',
    scientificName: 'Columbina talpacoti',
    commonNames: ['Ruddy Ground Dove', 'Rolinha', 'Rolinha-roxa'],
    keywords: ['dove', 'ground dove', 'rolinha']
  },
  {
    name: 'Sanhaço',
    scientificName: 'Tangara sayaca',
    commonNames: ['Sayaca Tanager', 'Sanhaço', 'Sanhaço-cinzento'],
    keywords: ['tanager', 'sanhaco', 'sayaca']
  },
  {
    name: 'Tico-tico',
    scientificName: 'Zonotrichia capensis',
    commonNames: ['Rufous-collared Sparrow', 'Tico-tico'],
    keywords: ['sparrow', 'zonotrichia', 'tico']
  },
  {
    name: 'Corruíra',
    scientificName: 'Troglodytes musculus',
    commonNames: ['Southern House Wren', 'Corruíra', 'Garrincha'],
    keywords: ['wren', 'corruira', 'house wren']
  },
  {
    name: 'Pica-pau',
    scientificName: 'Picidae',
    commonNames: ['Woodpecker', 'Pica-pau'],
    keywords: ['woodpecker', 'picapau', 'picidae']
  },
  {
    name: 'Andorinha',
    scientificName: 'Hirundinidae',
    commonNames: ['Swallow', 'Andorinha'],
    keywords: ['swallow', 'martin', 'andorinha']
  },
  {
    name: 'Pomba',
    scientificName: 'Columba livia',
    commonNames: ['Rock Pigeon', 'Pomba', 'Pombo'],
    keywords: ['pigeon', 'dove', 'pomba']
  },
  {
    name: 'Quero-quero',
    scientificName: 'Vanellus chilensis',
    commonNames: ['Southern Lapwing', 'Quero-quero'],
    keywords: ['lapwing', 'plover', 'queroquero']
  },
  {
    name: 'Sabiá-do-campo',
    scientificName: 'Mimus saturninus',
    commonNames: ['Chalk-browed Mockingbird', 'Sabiá-do-campo'],
    keywords: ['mockingbird', 'mimus', 'sabia']
  }
];

// Lista simplificada para compatibilidade
export const birdLabels = birdSpecies.map(species => species.name);