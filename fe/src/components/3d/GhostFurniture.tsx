import React, { useMemo, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { Mesh, MeshStandardMaterial, Box3, Vector3 } from 'three';
import { normalizeModel } from '@/utils/modelHelper';

// Define props locally
interface GhostFurnitureProps {
  position: [number, number, number];
  isColliding: boolean;
}

// 내부 컴포넌트: 실제 모델 로딩 담당
function GhostModel({ modelUrl, position, isColliding }: { modelUrl: string, position: [number, number, number], isColliding: boolean }) {
  // GLTF 로드 - Ngrok URL일 때만 Warning Bypass Header 추가
  const { scene } = useGLTF(modelUrl, true, true, (loader) => {
    if (modelUrl.includes('ngrok')) {
      loader.setRequestHeader({ 'ngrok-skip-browser-warning': 'true' });
    }
  });

  // Scene 복제 및 정규화 (Auto-Scale)
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone(true);
    
    // Auto-Scaling 적용 (1.5m 크기로 정규화, 바닥 정렬)
    normalizeModel(clone, 1.5);
    
    return { clone };
  }, [scene]);

  // Ghost Material 적용 (반투명)
  useLayoutEffect(() => {
    if (!clonedScene?.clone) return;

    clonedScene.clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        // 기존 Material을 덮어씌움 (Ghost 효과)
        mesh.material = new MeshStandardMaterial({
          color: isColliding ? '#ff0000' : '#00ffff', // 충돌 시 빨강, 아니면 시안
          transparent: true,
          opacity: 0.6,
          roughness: 1,
          metalness: 0,
        });
      }
    });
  }, [clonedScene, isColliding]);

  if (!clonedScene) return null;

  return (
    <group position={[position[0], position[1], position[2]]}>
      <primitive object={clonedScene.clone} />
    </group>
  );
}

export default function GhostFurniture({ position, isColliding }: GhostFurnitureProps) {
  const selectedRecommendation = useStore((state) => state.selectedRecommendation);
  const modelUrl = selectedRecommendation?.model_url;

  // modelUrl이 유효하지 않으면 hook을 호출하지 않기 위해 컴포넌트 분리
  if (!modelUrl) return null;

  return (
    <GhostModel 
      modelUrl={modelUrl} 
      position={position} 
      isColliding={isColliding} 
    />
  );
}
