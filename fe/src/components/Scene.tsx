'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import FurnitureItem from './3d/FurnitureItem';
import PanoramaSphere from './3d/PanoramaSphere';
import InvisibleRoom from './3d/InvisibleRoom';
import FloorGuide from './3d/FloorGuide';
import FloorOverlay from './3d/FloorOverlay';
import GhostFurniture from './3d/GhostFurniture';

export default function Scene() {
  const furnitures = useStore((state) => state.furnitures);
  const selectedFurnitureId = useStore((state) => state.selectedFurnitureId);
  const setSelectedFurnitureId = useStore((state) => state.setSelectedFurnitureId);
  const setMode = useStore((state) => state.setMode);
  const roomSize = useStore((state) => state.roomSize);
  const isDebugMode = useStore((state) => state.isDebugMode);
  
  const handleMissedClick = () => {
    setSelectedFurnitureId(null);
  };

  const mode = useStore((state) => state.mode);

  // ESC 키 전역 이벤트 리스너: 선택 해제 및 모드 초기화
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFurnitureId(null); // 선택 해제
        setMode('VIEW'); // 배치 모드 취소
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setSelectedFurnitureId, setMode]);

  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas onPointerMissed={handleMissedClick}>
        {/* FOV 75, 위치는 원점 근처 */}
        <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} />
        
        <ambientLight intensity={1.5} />
        
        <Suspense fallback={null}>
          {/* textureUrl이 있을 때만 PanoramaSphere 렌더링하여 Hook 에러 방지 */}
          {useStore.getState().textureUrl && <PanoramaSphere />}
          <FloorOverlay />
        </Suspense>

        <InvisibleRoom />

        {/* Visual Floor Guide - PLACE 모드이거나 Debug 모드일 때 표시 */}
        {(mode === 'PLACE' || isDebugMode) && <FloorGuide />}



        {/* Furnitures Rendering */}
        {furnitures.map((item) => (
          <FurnitureItem
            key={item.id}
            id={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedFurnitureId === item.id}
            onSelect={(e) => {
              e.stopPropagation();
              setSelectedFurnitureId(item.id);
            }}
          />
        ))}

        {/* 시점 회전만 가능하게 제한 (줌, 이동 비활성화) */}
        <OrbitControls 
          makeDefault // TransformControls와 충돌 방지를 위해 필수
          enableZoom={false} 
          enablePan={false} 
          rotateSpeed={-0.5} // 드래그 방향 반전 (직관적인 뷰잉)
        />
      </Canvas>
    </div>
  );
}
