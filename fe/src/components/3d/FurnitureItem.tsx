'use client';

import React, { useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { TransformControls } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Mesh, Euler } from 'three';

interface FurnitureItemProps {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onSelect: (e: ThreeEvent<MouseEvent>) => void;
}

export default function FurnitureItem({ id, position, rotation, isSelected, onSelect }: FurnitureItemProps) {
  const updateFurniture = useStore((state) => state.updateFurniture);
  const meshRef = useRef<Mesh>(null);
  const controlsRef = useRef<any>(null); // TransformControls 타입 추론이 까다로울 수 있어 any 사용
  const { gl } = useThree();

  // 회전 변경 감지 및 업데이트
  useEffect(() => {
    if (controlsRef.current) {
      const callback = () => {
        if (meshRef.current) {
          const newRotation: [number, number, number] = [
            meshRef.current.rotation.x,
            meshRef.current.rotation.y,
            meshRef.current.rotation.z
          ];
          // 실시간 업데이트보다는 드래그 종료 시 업데이트가 성능상 유리하지만,
          // 여기서는 즉각적인 반응을 위해 change 이벤트 활용 가능.
          // 하지만 TransformControls의 onMouseUp 이벤트를 직접 받기 어려우므로
          // change 이벤트에서 Store 업데이트 할 경우 빈번한 리렌더링 주의.
          // 여기서는 'change'이벤트에서 로컬 object만 변하고, 
          // 실제 저장은 onMouseUp 핸들러(TransformControls)에서 처리하는 것이 일반적임.
        }
      };

      controlsRef.current.addEventListener('change', callback);
      return () => controlsRef.current.removeEventListener('change', callback);
    }
  }, []);

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        rotation={rotation}
        onClick={onSelect}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={isSelected ? "orange" : "hotpink"} />
      </mesh>

      {isSelected && (
        <TransformControls
          object={meshRef as React.MutableRefObject<Mesh>}
          mode="rotate"
          // 드래그 시작 시 OrbitControls 비활성화
          onMouseDown={() => {
            const orbitControls = (gl.domElement.parentNode as any)?.orbitControls; // OrbitControls 접근 방식은 환경에 따라 다를 수 있음
            // R3F에서는 makeDefault로 설정된 OrbitControls를 자동으로 제어해줌 (드래그시 Orbit 멈춤)
          }}
          // 드래그 종료 시 회전값 저장
          onMouseUp={() => {
            if (meshRef.current) {
              const r = meshRef.current.rotation;
              updateFurniture(id, { rotation: [r.x, r.y, r.z] });
            }
          }}
        />
      )}
    </>
  );
}
