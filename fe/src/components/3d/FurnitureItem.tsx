'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { TransformControls, Html } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Mesh, Group, Vector3, Euler } from 'three';
import { checkCollision } from '@/utils/collision';

interface FurnitureItemProps {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onSelect: (e: ThreeEvent<MouseEvent>) => void;
}

type ManipulationMode = 'translate' | 'rotate';

export default function FurnitureItem({ id, position, rotation, isSelected, onSelect }: FurnitureItemProps) {
  const updateFurniture = useStore((state) => state.updateFurniture);
  const furnitures = useStore((state) => state.furnitures);
  const roomSize = useStore((state) => state.roomSize);
  const meshRef = useRef<Mesh>(null);
  const tooltipRef = useRef<Group>(null);
  const { gl } = useThree();
  
  // UX Requirement: 기본 모드는 'translate'
  const [manipulationMode, setManipulationMode] = useState<ManipulationMode>('translate');
  
  // 충돌 감지 상태
  const [isColliding, setIsColliding] = useState(false);
  // 직전 유효 위치 저장 (충돌 시 복원용)
  const lastValidPosition = useRef<[number, number, number]>(position);

  // 키보드 모드 토글 로직
  useEffect(() => {
    if (!isSelected) {
        // 선택 해제 시 모드를 기본값(translate)으로 리셋 (선택적 UX)
        // 사용자가 다시 선택했을 때 translate로 시작하는 것이 일반적
        setManipulationMode('translate');
        return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // 대소문자 구분 없이 처리
      const key = e.key.toLowerCase();
      if (key === 'r') {
        setManipulationMode('rotate');
      } else if (key === 't') {
        setManipulationMode('translate');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelected]);

  // 가구 조작 완료 시 Store 업데이트
  const handleTransformEnd = () => {
    // 충돌 상태에서 조작 종료 시 저장 무시 (이미 직전 유효 위치로 복원됨)
    if (isColliding) {
      console.warn('충돌 상태로 조작 종료: 저장 무시');
      return;
    }
    
    if (meshRef.current) {
        const newPos = meshRef.current.position; // Vector3
        const newRot = meshRef.current.rotation; // Euler

        updateFurniture(id, {
            position: newPos, // Vector3
            rotation: [newRot.x, newRot.y, newRot.z], // Euler -> [x, y, z] 변환
        });
    }
  };

  // 실시간 이동 제한 (Boundary Constraint)
  const handleObjectChange = () => {
    if (meshRef.current && manipulationMode === 'translate') {
      const mesh = meshRef.current;
      
      // 방의 경계 계산 (가구의 중심 기준)
      const halfWidth = roomSize.width / 2;
      const halfDepth = roomSize.depth / 2;

      // 현재 위치
      const currentPos = mesh.position;

      // 경계 제한 (Clamp)
      // 가구 크기(1x1)를 고려하지 않고 중심점 기준으로 단순 제한하거나,
      // 정밀하게 하려면 가구의 BoundingBox를 고려해야 함.
      // 여기서는 중심점 기준으로 -half ~ +half 범위로 제한.
      const clampedX = Math.max(-halfWidth, Math.min(halfWidth, currentPos.x));
      const clampedZ = Math.max(-halfDepth, Math.min(halfDepth, currentPos.z));

      // 위치 보정 적용
      mesh.position.set(clampedX, currentPos.y, clampedZ);
      
      // 충돌 감지 (자기 자신 제외)
      const potentialPos: [number, number, number] = [mesh.position.x, mesh.position.y, mesh.position.z];
      const otherFurnitures = furnitures.filter(f => f.id !== id);
      
      const collision = checkCollision(
        potentialPos,
        { width: 1, depth: 1 }, // 현재 가구 크기
        otherFurnitures
      );
      
      if (collision) {
        // 충돌 시: 직전 유효 위치로 복원
        setIsColliding(true);
        mesh.position.set(...lastValidPosition.current);
      } else {
        // 비충돌 시: 현재 위치를 유효 위치로 저장
        setIsColliding(false);
        lastValidPosition.current = potentialPos;
      }
    }
    
    // 툴팁 위치 동기화 (회전 영향 받지 않도록 위치만 복사)
    if (meshRef.current && tooltipRef.current) {
      tooltipRef.current.position.copy(meshRef.current.position);
    }
  };

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
        <meshStandardMaterial 
          color={
            isColliding && isSelected ? "red" : 
            isSelected ? "orange" : 
            "hotpink"
          } 
        />
    </mesh>

    {/* 툴팁: 회전 영향 없이 위치만 따라다니도록 별도 그룹 사용 */}
    {isSelected && (
      <group ref={tooltipRef} position={position}>
        <Html position={[0, 1.5, 0]} center>
          <div className="whitespace-nowrap bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/20 shadow-xl flex flex-col items-center gap-1">
            <div className="text-xs text-gray-300 uppercase tracking-wider">Mode</div>
            <div className="text-base font-bold text-blue-400">
              {manipulationMode === 'translate' ? '이동 (Translate)' : '회전 (Rotate)'}
            </div>
            <div className="h-px w-full bg-white/20 my-1" />
            <div className="flex gap-2 text-xs">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setManipulationMode('rotate');
                }}
                className={`kb-button ${manipulationMode === 'rotate' ? 'kb-button-active' : 'kb-button-inactive'}`}
              >
                <span className="kb-key">[R]</span> 회전
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setManipulationMode('translate');
                }}
                className={`kb-button ${manipulationMode === 'translate' ? 'kb-button-active' : 'kb-button-inactive'}`}
              >
                <span className="kb-key">[T]</span> 이동
              </button>
            </div>
          </div>
          <style>{`
            .kb-key {
              background: rgba(255,255,255,0.2);
              padding: 1px 4px;
              border-radius: 4px;
              margin-right: 2px;
            }
            .kb-button {
              padding: 4px 8px;
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.2);
              cursor: pointer;
              transition: all 0.2s ease;
              background: rgba(255,255,255,0.05);
            }
            .kb-button:hover {
              background: rgba(255,255,255,0.15);
              border-color: rgba(255,255,255,0.4);
              transform: translateY(-1px);
            }
            .kb-button-active {
              color: white;
              font-weight: bold;
              background: rgba(59, 130, 246, 0.3);
              border-color: rgba(59, 130, 246, 0.6);
            }
            .kb-button-inactive {
              color: rgb(156, 163, 175);
            }
          `}</style>
        </Html>
      </group>
    )}

    {isSelected && (
      <TransformControls
        object={meshRef as React.MutableRefObject<Mesh>}
        mode={manipulationMode}
        // 드래그 종료 시 위치/회전값 저장
        onMouseUp={handleTransformEnd}
        // 이동 중 경계 제한 및 툴팁 위치 동기화
        onObjectChange={handleObjectChange}
      />
    )}
    </>
  );
}
