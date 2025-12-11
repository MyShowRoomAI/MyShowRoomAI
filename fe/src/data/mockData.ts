export interface FurnitureItem {
  id: string; // UUID 형식 가정 (number -> string 변경)
  name: string;
  price: string;
  image: string;
  model_url: string; // 3D 모델 파일 경로
  desc: string;
  scale?: [number, number, number]; // 모델 스케일 (선택적)
}

export const FURNITURE_DATA: FurnitureItem[] = [
  { id: '1', name: 'Modern Linen Sofa', price: '$1,299', image: '🛋️', desc: 'Beige contemporary sofa', model_url: '/models/sofa.glb' },
  { id: '2', name: 'Walnut Coffee Table', price: '$399', image: '📦', desc: 'Solid wood design', model_url: '/models/table.glb' },
  { id: '3', name: 'Floor Lamp Pro', price: '$189', image: '💡', desc: 'LED adjustable lighting', model_url: '/models/lamp.glb' },
  { id: '4', name: 'Area Rug Natural', price: '$299', image: '📐', desc: 'Wool blend texture', model_url: '/models/rug.glb' },
];
