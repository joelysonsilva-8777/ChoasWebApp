export interface AvatarComponents {
  body: string; // Skin tone: 'PeleBranca', 'PelePardo', 'PelePreto'
  hair: string; // Hair style: 'Male_CastanhoClaro_Curto_0', 'Female_Loiro_Longo_5', etc
  hat: string; // Hat: 'Hat_0', 'Hat_1', etc
  accessory?: string; // Accessory: '1', '2', '3' or empty
  clothing: string; // Clothing: 'Roupa_Azul', 'Roupa_Preta', etc
}

export interface AvatarOption {
  value: string;
  label: string;
  category: string;
}

// Avatar body options (skin tones)
export const AVATAR_BODIES = [
  { value: 'PeleBranca', label: 'Pele Branca' },
  { value: 'PelePardo', label: 'Pele Parda' },
  { value: 'PelePreto', label: 'Pele Preta' },
];

// Hair color and length options - matching .NET format
const HAIR_COLORS = ['CastanhoClaro', 'CastanhoEscuro', 'Loiro', 'PretoEncaracolado', 'VermelhoFogo', 'Acinzentado'];
const HAIR_LENGTHS = ['Curto', 'Medio', 'Longo'];
const GENDERS = ['Male', 'Female'];

export const getHairOptions = (): AvatarOption[] => {
  const options: AvatarOption[] = [];

  GENDERS.forEach((gender) => {
    HAIR_COLORS.forEach((color) => {
      HAIR_LENGTHS.forEach((length) => {
        for (let i = 0; i < 10; i++) {
          options.push({
            value: `${gender}_${color}_${length}_${i}`,
            label: `${gender === 'Female' ? '👩' : '👨'} ${color} - ${length}`,
            category: `${gender} ${length}`,
          });
        }
      });
    });
  });

  return options;
};

// Hat options
export const AVATAR_HATS = Array.from({ length: 13 }, (_, i) => {
  const hat = i === 12 ? 'Hat_16' : `Hat_${i}`;
  return {
    value: hat,
    label: `Chapéu ${i + 1}`,
  };
});

export const AVATAR_HATS_NONE = { value: '', label: 'Sem Chapéu' };

// Accessory options
export const AVATAR_ACCESSORIES = [
  { value: '', label: 'Sem Acessório' },
  { value: '1', label: 'Acessório 1' },
  { value: '2', label: 'Acessório 2' },
  { value: '3', label: 'Acessório 3' },
];

// Clothing options
export const AVATAR_CLOTHING = [
  { value: 'Roupa_Azul', label: 'Azul' },
  { value: 'Roupa_Branca', label: 'Branca' },
  { value: 'Roupa_Laranja', label: 'Laranja' },
  { value: 'Roupa_Preta', label: 'Preta' },
  { value: 'Roupa_Rosa', label: 'Rosa' },
  { value: 'Roupa_Verde', label: 'Verde' },
  { value: 'Roupa_Vermelha', label: 'Vermelha' },
  { value: 'Roupa_Violeta', label: 'Violeta' },
];

// Default avatar
export const DEFAULT_AVATAR: AvatarComponents = {
  body: 'PeleBranca',
  hair: 'Female_Loiro_Longo_0',
  hat: 'Hat_0',
  accessory: '',
  clothing: 'Roupa_Azul',
};

// Convert Firestore format to component format (handles legacy formats too)
export const normalizeAvatar = (data: any): AvatarComponents => {
  if (!data) return DEFAULT_AVATAR;

  return {
    body: data.body || data.avatarBody || 'PeleBranca',
    hair: data.hair || data.avatarHair || 'Female_Loiro_Longo_0',
    hat: data.hat || data.avatarHat || 'Hat_0',
    accessory: data.accessory || data.avatarAccessory || '',
    clothing: data.clothing || data.avatarClothing || 'Roupa_Azul',
  };
};

// Generate avatar layer image path - Fixed for correct folder names
export const getAvatarLayerPath = (
  body: string,
  hair: string,
  hat: string,
  accessory: string | undefined,
  clothing: string
): { personagem: string; cabelos: string; chapeu: string; acessorio: string; roupa: string } => {
  // Parse hair to get folder (e.g., "Male_CastanhoClaro_Curto_0" -> "Curto")
  const hairParts = hair.split('_');
  const hairLength = hairParts[2]; // Curto, Medio, Longo

  // Map to correct folder name
  const folderMap: Record<string, string> = {
    Curto: 'Cabelos_Curtos',
    Medio: 'Cabelos_Medios',
    Longo: 'Cabelos_Longos',
  };

  const folderName = folderMap[hairLength] || 'Cabelos_Medios';

  return {
    personagem: `/img/avatar/Personagens/${body}.png`,
    cabelos: `/img/avatar/${folderName}/${hair}.png`,
    chapeu: hat ? `/img/avatar/Hats/${hat}.png` : '',
    acessorio: accessory ? `/img/avatar/Acessory/${accessory}.png` : '',
    roupa: `/img/avatar/Roupas/${clothing}.png`,
  };
};

// Validate avatar selection
export const isValidAvatarSelection = (avatar: Partial<AvatarComponents>): boolean => {
  return !!(avatar.body && avatar.hair && avatar.clothing);
};

// Quick suggestions for avatar combinations - using .NET format
export const getAvatarSuggestions = (): AvatarComponents[] => {
  return [
    {
      body: 'PeleBranca',
      hair: 'Female_Loiro_Longo_0',
      hat: 'Hat_0',
      accessory: '',
      clothing: 'Roupa_Azul',
    },
    {
      body: 'PelePardo',
      hair: 'Female_CastanhoEscuro_Curto_3',
      hat: 'Hat_2',
      accessory: '1',
      clothing: 'Roupa_Rosa',
    },
    {
      body: 'PelePreto',
      hair: 'Male_PretoEncaracolado_Medio_5',
      hat: 'Hat_5',
      accessory: '',
      clothing: 'Roupa_Preta',
    },
    {
      body: 'PeleBranca',
      hair: 'Male_CastanhoClaro_Curto_2',
      hat: 'Hat_1',
      accessory: '2',
      clothing: 'Roupa_Verde',
    },
  ];
};
