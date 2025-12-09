'use client';

import { useTexture } from '@react-three/drei';
import { BackSide } from 'three';

export default function PanoramaSphere() {
  // .hdr 대신 일반 .jpg 포맷의 360도 이미지를 사용합니다.
  // Three.js 예제에서 사용하는 Park 파노라마 이미지입니다.
  const texture = useTexture('https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg');

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}
