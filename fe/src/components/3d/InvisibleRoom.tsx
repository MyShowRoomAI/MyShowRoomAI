'use client';

import { ThreeEvent } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { useRef, useState } from 'react';
import { Mesh, Vector3, BackSide } from 'three';

export default function InvisibleRoom() {
  const mode = useStore((state) => state.mode);
  const setCursorPosition = useStore((state) => state.setCursorPosition);
  const cursorPosition = useStore((state) => state.cursorPosition);
  const addFurniture = useStore((state) => state.addFurniture);
  const setSelectedFurnitureId = useStore((state) => state.setSelectedFurnitureId);
  const roomSize = useStore((state) => state.roomSize);
  const isDebugMode = useStore((state) => state.isDebugMode);
  
  const ghostRef = useRef<Mesh>(null);
  // 드래그 감지를 위한 포인터 다운 위치 저장
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // 방의 바닥 높이 계산
  const floorY = -roomSize.height / 2;

  // 투영 로직: 어느 면을 찍든 바닥(y)으로 투영
  const projectToFloor = (point: Vector3): Vector3 => {
    // x, z는 유지하고 y만 바닥 높이로 고정
    // 단, x, z가 방 크기를 벗어나지 않도록 clamp (안전장치)
    const clampedX = Math.max(-roomSize.width / 2, Math.min(roomSize.width / 2, point.x));
    const clampedZ = Math.max(-roomSize.depth / 2, Math.min(roomSize.depth / 2, point.z));
    
    return new Vector3(clampedX, floorY, clampedZ);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // Raycasting된 포인트를 바닥으로 투영하여 커서 위치 업데이트
    const projectedPoint = projectToFloor(e.point);
    setCursorPosition(projectedPoint);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // 마우스 다운 시점의 화면 좌표 저장
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // 드래그 감지: 포인터 다운 위치와 현재 위치 비교
    if (pointerDownPos.current) {
      const deltaX = e.clientX - pointerDownPos.current.x;
      const deltaY = e.clientY - pointerDownPos.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 5px 이상 움직였으면 드래그로 간주하고 무시
      if (distance > 5) {
        pointerDownPos.current = null;
        return;
      }
    }
    
    if (mode === 'PLACE') {
      // PLACE 모드: 가구 배치
      const projectedPoint = projectToFloor(e.point);
      addFurniture(projectedPoint);
    } else {
      // VIEW 모드: 빈 공간 클릭 시 선택 해제
      setSelectedFurnitureId(null);
    }
    
    pointerDownPos.current = null;
  };

  return (
    <>
      {/* Invisible Room Proxy Geometry */}
      <mesh
        visible={isDebugMode}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <boxGeometry args={[roomSize.width, roomSize.height, roomSize.depth]} />
        <meshBasicMaterial 
          color="cyan" 
          wireframe={true} // 항상 Wireframe으로 표시하여 뒤에 있는 파노라마를 가리지 않음
          side={BackSide} // 상자 안쪽 면에서 레이캐스팅 감지
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Ghost Cube for Debugging / Preview - Only visible in PLACE mode */}
      {mode === 'PLACE' && (
        <mesh position={cursorPosition} ref={ghostRef}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="cyan" transparent opacity={0.5} />
        </mesh>
      )}
    </>
  );
}
