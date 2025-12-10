'use client';

import { ThreeEvent } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { useRef } from 'react';
import { Mesh, Vector3 } from 'three';

export default function InvisibleFloor() {
  const mode = useStore((state) => state.mode);
  const setCursorPosition = useStore((state) => state.setCursorPosition);
  const cursorPosition = useStore((state) => state.cursorPosition);
  const addFurniture = useStore((state) => state.addFurniture);
  const roomSize = useStore((state) => state.roomSize);
  
  const ghostRef = useRef<Mesh>(null);

  const clampPosition = (point: Vector3): Vector3 => {
    // 직사각형 영역 제한 (x: -width/2 ~ width/2, z: -depth/2 ~ depth/2)
    const clampedX = Math.max(-roomSize.width / 2, Math.min(roomSize.width / 2, point.x));
    const clampedZ = Math.max(-roomSize.depth / 2, Math.min(roomSize.depth / 2, point.z));
    
    return new Vector3(clampedX, point.y, clampedZ);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // 바닥과 교차된 지점을 스토어에 업데이트 (Clamping 적용)
    const clampedPoint = clampPosition(e.point);
    setCursorPosition(clampedPoint);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode === 'PLACE') {
      const clampedPoint = clampPosition(e.point);
      addFurniture(clampedPoint);
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
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="cyan" transparent opacity={0.5} />
      </mesh>
    </>
  );
}
