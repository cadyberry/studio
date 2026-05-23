export interface ColorSwatch {
  hex: string;
  name?: string;
}

export interface Palette {
  id: string;
  name: string;
  colors: ColorSwatch[];
  sourceImage?: string; // base64 thumbnail
  collectionId?: string;
  tags: string[];
  frozen?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverPaletteId?: string;
  createdAt: string;
  updatedAt: string;
}
