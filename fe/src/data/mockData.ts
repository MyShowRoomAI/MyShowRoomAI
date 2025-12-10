export interface FurnitureItem {
  id: number;
  name: string;
  price: string;
  image: string;
  desc: string;
}

export const FURNITURE_DATA: FurnitureItem[] = [
  { id: 1, name: 'Modern Linen Sofa', price: '$1,299', image: '🛋️', desc: 'Beige contemporary sofa' },
  { id: 2, name: 'Walnut Coffee Table', price: '$399', image: '📦', desc: 'Solid wood design' },
  { id: 3, name: 'Floor Lamp Pro', price: '$189', image: '💡', desc: 'LED adjustable lighting' },
  { id: 4, name: 'Area Rug Natural', price: '$299', image: '📐', desc: 'Wool blend texture' },
];
