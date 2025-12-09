'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { useStore } from '@/store/useStore';
import PanoramaSphere from './3d/PanoramaSphere';
import InvisibleFloor from './3d/InvisibleFloor';

export default function Scene() {
  const furnitures = useStore((state) => state.furnitures);

  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas>
        {/* FOV 75, 위치는 원점 근처 */}
        <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} />
        
        <ambientLight intensity={1.5} />
        
        <Suspense fallback={null}>
          <PanoramaSphere />
        </Suspense>

        <InvisibleFloor />

        {/* Furnitures Rendering */}
        {furnitures.map((item) => (
          <mesh key={item.id} position={item.position}>
            {/* 임시 가구 모델: 파란색 상자 */}
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="blue" />
          </mesh>
        ))}

        {/* 시점 회전만 가능하게 제한 (줌, 이동 비활성화) */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          rotateSpeed={-0.5} // 드래그 방향 반전 (직관적인 뷰잉)
        />
      </Canvas>
    </div>
  );
}
