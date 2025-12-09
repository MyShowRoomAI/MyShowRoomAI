'use client';

import { ThreeEvent } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { useRef } from 'react';
import { Mesh } from 'three';

export default function InvisibleFloor() {
  const mode = useStore((state) => state.mode);
  const setCursorPosition = useStore((state) => state.setCursorPosition);
  const cursorPosition = useStore((state) => state.cursorPosition);
  const addFurniture = useStore((state) => state.addFurniture);
  
  const ghostRef = useRef<Mesh>(null);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // 바닥과 교차된 지점을 스토어에 업데이트
    setCursorPosition(e.point);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode === 'PLACE') {
      addFurniture(e.point);
    }
  };

  return (
    <>
      {/* Invisible Logic Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -1.5, 0]} 
        visible={false}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      {/* Ghost Cube for Debugging */}
      <mesh position={cursorPosition} ref={ghostRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="cyan" transparent opacity={0.5} />
      </mesh>
    </>
  );
}
