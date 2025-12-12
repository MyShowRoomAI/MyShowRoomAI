'use client';

import { useStore } from '@/store/useStore';
import { useTexture } from '@react-three/drei';
import { BackSide } from 'three';

function FloorOverlayMesh({ url }: { url: string }) {
  const texture = useTexture(url);

  return (
    <mesh scale={[-1, 1, 1]} frustumCulled={false} renderOrder={1}>
      {/* 
        PanoramaSphere is 500 radius. 
        We use 450 to ensure physical separation.
        DoubleSide + frustumCulled=false guarantees visibility from any angle.
      */}
      <sphereGeometry args={[450, 64, 32]} />
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        opacity={0.8} 
        side={2} // DoubleSide - Critical for visibility
        depthWrite={false} 
        depthTest={true} // Ensure it sorts correctly against objects
      />
    </mesh>
  );
}

export default function FloorOverlay() {
  const floorMaskUrl = useStore((state) => state.floorMaskUrl);

  if (!floorMaskUrl) {
    return null;
  }

  return <FloorOverlayMesh url={floorMaskUrl} />;
}
