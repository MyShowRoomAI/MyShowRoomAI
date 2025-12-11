import React, { useMemo, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { Mesh, MeshStandardMaterial } from 'three';
import { normalizeModel } from '@/utils/modelHelper';

// Define props locally
interface GhostFurnitureProps {
  position: [number, number, number];
  isColliding: boolean;
}

export default function GhostFurniture({ position, isColliding }: GhostFurnitureProps) {
  const selectedRecommendation = useStore((state) => state.selectedRecommendation);
  const modelUrl = selectedRecommendation?.model_url;

  // GLTF 로드
  const { scene } = useGLTF(modelUrl || '', true);

  // Scene 복제 및 정규화 (Auto-Scale)
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone(true);
    
    // Auto-Scaling 적용 (1.5m 크기로 정규화)
    // 백엔드에서 scale을 주지 않으므로 여기서 자동 계산
    normalizeModel(clone, 1.5);
    
    return clone;
  }, [scene]);

  // Ghost Material 적용 (반투명)
  useLayoutEffect(() => {
    if (!clonedScene) return;

    clonedScene.traverse((child) => {
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




  if (!modelUrl || !clonedScene) return null;

  return (
    <primitive 
      object={clonedScene} 
      position={position} 
    />
  );
}
