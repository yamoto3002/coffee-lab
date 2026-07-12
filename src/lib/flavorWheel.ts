export type FlavorLeaf = {
  name: string;
  label: string;
};

export type FlavorSubcategory = {
  name: string;
  label: string;
  flavors: FlavorLeaf[];
};

export type FlavorCategory = {
  name: string;
  label: string;
  color: string;
  subcategories: FlavorSubcategory[];
};

export const FLAVOR_CATEGORIES: FlavorCategory[] = [
  {
    name: 'floral',
    label: 'Floral',
    color: '#C084FC',
    subcategories: [
      { name: 'white-flower', label: 'White Flower', flavors: [{ name: 'jasmine', label: 'Jasmine' }, { name: 'orange-blossom', label: 'Orange Blossom' }, { name: 'elderflower', label: 'Elderflower' }] },
      { name: 'purple-flower', label: 'Purple Flower', flavors: [{ name: 'violet', label: 'Violet' }, { name: 'lavender', label: 'Lavender' }, { name: 'rose', label: 'Rose' }] },
    ],
  },
  {
    name: 'fruit',
    label: 'Fruit',
    color: '#FB3D71',
    subcategories: [
      { name: 'berry', label: 'Berry', flavors: [{ name: 'strawberry', label: 'Strawberry' }, { name: 'raspberry', label: 'Raspberry' }, { name: 'blueberry', label: 'Blueberry' }, { name: 'blackberry', label: 'Blackberry' }] },
      { name: 'stone-fruit', label: 'Stone Fruit', flavors: [{ name: 'peach', label: 'Peach' }, { name: 'apricot', label: 'Apricot' }, { name: 'plum', label: 'Plum' }] },
      { name: 'dried-fruit', label: 'Dried Fruit', flavors: [{ name: 'raisin', label: 'Raisin' }, { name: 'fig', label: 'Fig' }, { name: 'date', label: 'Date' }] },
    ],
  },
  {
    name: 'citrus',
    label: 'Citrus',
    color: '#FACC15',
    subcategories: [
      { name: 'bright-citrus', label: 'Bright', flavors: [{ name: 'lemon', label: 'Lemon' }, { name: 'lime', label: 'Lime' }, { name: 'grapefruit', label: 'Grapefruit' }] },
      { name: 'sweet-citrus', label: 'Sweet', flavors: [{ name: 'orange', label: 'Orange' }, { name: 'mandarin', label: 'Mandarin' }, { name: 'bergamot', label: 'Bergamot' }] },
    ],
  },
  {
    name: 'sweet',
    label: 'Sweet',
    color: '#FF8A3D',
    subcategories: [
      { name: 'sugar', label: 'Sugar', flavors: [{ name: 'honey', label: 'Honey' }, { name: 'brown-sugar', label: 'Brown Sugar' }, { name: 'molasses', label: 'Molasses' }] },
      { name: 'caramelized', label: 'Caramelized', flavors: [{ name: 'caramel', label: 'Caramel' }, { name: 'toffee', label: 'Toffee' }, { name: 'maple', label: 'Maple' }] },
    ],
  },
  {
    name: 'chocolate',
    label: 'Chocolate',
    color: '#A96F4B',
    subcategories: [
      { name: 'cacao', label: 'Cacao', flavors: [{ name: 'chocolate', label: 'Chocolate' }, { name: 'dark-chocolate', label: 'Dark Chocolate' }, { name: 'cocoa', label: 'Cocoa' }] },
      { name: 'milk-chocolate', label: 'Soft', flavors: [{ name: 'milk-chocolate-note', label: 'Milk Chocolate' }, { name: 'cacao-nib', label: 'Cacao Nib' }, { name: 'fudge', label: 'Fudge' }] },
    ],
  },
  {
    name: 'nutty',
    label: 'Nutty',
    color: '#D29A54',
    subcategories: [
      { name: 'tree-nut', label: 'Tree Nut', flavors: [{ name: 'almond', label: 'Almond' }, { name: 'hazelnut', label: 'Hazelnut' }, { name: 'walnut', label: 'Walnut' }] },
      { name: 'roasted-nut-group', label: 'Roasted', flavors: [{ name: 'peanut', label: 'Peanut' }, { name: 'praline', label: 'Praline' }, { name: 'marzipan', label: 'Marzipan' }] },
    ],
  },
  {
    name: 'herbal',
    label: 'Herbal / Green',
    color: '#22C55E',
    subcategories: [
      { name: 'fresh', label: 'Fresh', flavors: [{ name: 'mint', label: 'Mint' }, { name: 'basil', label: 'Basil' }, { name: 'green-tea', label: 'Green Tea' }] },
      { name: 'green', label: 'Green', flavors: [{ name: 'grass', label: 'Grass' }, { name: 'vegetal', label: 'Vegetal' }, { name: 'olive', label: 'Olive' }] },
    ],
  },
  {
    name: 'spice',
    label: 'Spice',
    color: '#EF4444',
    subcategories: [
      { name: 'warm-spice', label: 'Warm', flavors: [{ name: 'cinnamon', label: 'Cinnamon' }, { name: 'clove', label: 'Clove' }, { name: 'nutmeg', label: 'Nutmeg' }] },
      { name: 'sharp-spice', label: 'Sharp', flavors: [{ name: 'pepper', label: 'Pepper' }, { name: 'ginger', label: 'Ginger' }, { name: 'anise', label: 'Anise' }] },
    ],
  },
  {
    name: 'roast',
    label: 'Roasted',
    color: '#8F6B55',
    subcategories: [
      { name: 'brown', label: 'Brown', flavors: [{ name: 'toast', label: 'Toast' }, { name: 'biscuit', label: 'Biscuit' }, { name: 'malt', label: 'Malt' }] },
      { name: 'deep', label: 'Deep', flavors: [{ name: 'smoky', label: 'Smoky' }, { name: 'roasted-nut', label: 'Roasted Nut' }, { name: 'molten-cocoa', label: 'Molten Cocoa' }] },
    ],
  },
  {
    name: 'fermented',
    label: 'Fermented',
    color: '#B04A78',
    subcategories: [
      { name: 'winey', label: 'Winey', flavors: [{ name: 'red-wine', label: 'Red Wine' }, { name: 'rum', label: 'Rum' }, { name: 'brandy', label: 'Brandy' }] },
      { name: 'cultured', label: 'Cultured', flavors: [{ name: 'yogurt', label: 'Yogurt' }, { name: 'kombucha', label: 'Kombucha' }, { name: 'ripe-fruit', label: 'Ripe Fruit' }] },
    ],
  },
  {
    name: 'other',
    label: 'Other',
    color: '#6FB9C7',
    subcategories: [
      { name: 'mineral', label: 'Mineral', flavors: [{ name: 'saline', label: 'Saline' }, { name: 'mineral-note', label: 'Mineral' }, { name: 'earthy', label: 'Earthy' }] },
      { name: 'texture', label: 'Texture', flavors: [{ name: 'tea-like', label: 'Tea-like' }, { name: 'syrupy', label: 'Syrupy' }, { name: 'silky', label: 'Silky' }] },
    ],
  },
];

export function flavorColor(flavorLabel: string | undefined, fallback = '#00DFFF'): string {
  if (!flavorLabel) return fallback;
  for (const category of FLAVOR_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      if (subcategory.flavors.some(flavor => flavor.label === flavorLabel || flavor.name === flavorLabel)) {
        return category.color;
      }
    }
  }
  return fallback;
}

export function flavorCategoryLabel(flavorLabel: string | undefined): string {
  if (!flavorLabel) return '';
  for (const category of FLAVOR_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      if (subcategory.flavors.some(flavor => flavor.label === flavorLabel || flavor.name === flavorLabel)) {
        return category.label;
      }
    }
  }
  return '';
}
