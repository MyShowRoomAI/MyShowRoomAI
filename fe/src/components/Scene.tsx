'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

export default function Scene() {
  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        
        <gridHelper args={[20, 20]} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
