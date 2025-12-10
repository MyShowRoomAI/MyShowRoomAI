'use client';

import { useTexture } from '@react-three/drei';
import { BackSide } from 'three';
import { useStore } from '@/store/useStore';

export default function PanoramaSphere() {
  const textureUrl = useStore((state) => state.textureUrl);
  // Store에 저장된 textureUrl을 사용
  // textureUrl이 없으면 렌더링하지 않음 (이론상 Landing Page에서 걸러지지만, 타입 안전성을 위해 추가)
  if (!textureUrl) return null;

  const texture = useTexture(textureUrl);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}
