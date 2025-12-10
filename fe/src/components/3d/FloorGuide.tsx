'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { Edges } from '@react-three/drei';

export default function FloorGuide() {
  const roomSize = useStore((state) => state.roomSize);

  return (
    <group position={[0, -1.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 바닥 영역 표시 (반투명) */}
      <mesh>
        <planeGeometry args={[roomSize.width, roomSize.depth]} />
        <meshBasicMaterial 
          color="#00ffff" 
          transparent 
          opacity={0.15} 
          depthWrite={false} 
        />
      </mesh>

      {/* 테두리 라인 */}
      <mesh>
        <planeGeometry args={[roomSize.width, roomSize.depth]} />
        <meshBasicMaterial color="white" transparent opacity={0.0} />
        <Edges 
          scale={1} 
          threshold={15} // 15도 이상 꺾이면 엣지 표시 (평면이라 상관없음)
          color="#00ffff"
        />
      </mesh>
    </group>
  );
}
