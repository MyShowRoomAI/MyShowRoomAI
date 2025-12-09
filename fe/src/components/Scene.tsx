'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import PanoramaSphere from './3d/PanoramaSphere';
import InvisibleFloor from './3d/InvisibleFloor';

export default function Scene() {
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
