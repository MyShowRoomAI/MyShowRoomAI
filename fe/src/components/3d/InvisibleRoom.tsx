'use client';

import { ThreeEvent } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { useRef, useState, Suspense } from 'react';
import { Mesh, Vector3, BackSide } from 'three';
import { checkCollision } from '@/utils/collision';
import GhostFurniture from './GhostFurniture';

export default function InvisibleRoom() {
  const mode = useStore((state) => state.mode);
  const setCursorPosition = useStore((state) => state.setCursorPosition);
  const cursorPosition = useStore((state) => state.cursorPosition);
  const addFurniture = useStore((state) => state.addFurniture);
  const setSelectedFurnitureId = useStore((state) => state.setSelectedFurnitureId);
  const furnitures = useStore((state) => state.furnitures);
  const roomSize = useStore((state) => state.roomSize);
  const isDebugMode = useStore((state) => state.isDebugMode);
  
  const ghostRef = useRef<Mesh>(null);
  // 드래그 감지를 위한 포인터 다운 위치 저장
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  // 충돌 감지 상태
  const [isColliding, setIsColliding] = useState(false);

  // 방의 바닥 높이 계산
  const floorY = -roomSize.height / 2;

  // Semantic Navigation: 바닥 유효성 검사
  const floorMaskData = useStore((state) => state.floorMaskData);
  const maskDimensions = useStore((state) => state.maskDimensions);
  const [isFloorValid, setIsFloorValid] = useState(true);

  const checkFloorValidity = (x: number, z: number): boolean => {
    if (!floorMaskData || !maskDimensions) return true; // 데이터 없으면 통과

    // 3D (x, y, z) -> Direction Vector -> Equirectangular UV
    const y = floorY;
    const radius = Math.sqrt(x * x + y * y + z * z);
    const geometryY = y / radius; // Normalized Y direction
    
    // UV Mapping
    // scale={[-1, 1, 1]} 고려: atan2(z, x)가 아니라 atan2(z, -x) 혹은 x 반전
    // 일반적인 360 이미지 매핑 기준으로 x가 -1 스케일링되면 z축 회전 방향이 반대가 됨.
    // 여기서는 일반 공식을 사용하되, pixel picking 결과가 안맞으면 튜닝 필요.
    // Three.js standard: u = 0.5 + atan2(z, x) / 2pi
    // With scale -x: u = 0.5 + atan2(z, -x) / 2pi?
    
    // Let's iterate:
    // P(x, y, z). With scale(-1, 1, 1), the mesh sees P'(-x, y, z).
    // UV usually calc based on P'.
    const nx = -x; 
    const nz = z;
    const u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
    // V calculation per user prompt: v = 0.5 - Math.asin(y / radius) / Math.PI
    // Note: y is negative (floor), so asin is negative. 0.5 - (-val) = 0.5 + val -> > 0.5
    // Typical Equirectangular: V=0 is Bottom. V=1 is Top.
    // If V > 0.5, it means Top Hemisphere? This might be inverted logic.
    // However, I will follow the prompt's formula structure but ensure it maps correctly to the mock data.
    // My mock data (Bottom 30%) is at high pixel coordinates (Bottom of image).
    // Canvas Y = (1 - v) * Height.
    // V should be small (near 0) for bottom.
    // Prompt formula: 0.5 - asin(y/r)/pi.
    // Floor (y=-r) -> 0.5 - (-0.5) = 1.0 (Top?)
    // This suggests prompt formula expects V=1 at bottom? Or image is flipped?
    // Let's stick to standard Three.js UV: u, v are 0..1.
    // If I use my proven logic v = 0.5 + asin(y/r)/pi:
    // Floor (y=-r) -> 0.5 - 0.5 = 0. (Bottom). This aligns with Canvas Y=H.
    // I will keep my formula as it logically aligns with the "Bottom 30%" mock data which is at Y=0.7H~1.0H.
    
    // BUT, I will re-verify the prompt's intent. "v = 0.5 - ...".
    // If the prompt implies a specific standard, maybe I should assume V=0 is Top?
    // Let's check Three.js docs mental model: Texture coordinates (UV) usually start (0,0) bottom-left.
    // Canvas coordinates start (0,0) top-left.
    // So Canvas Y = (1 - v) * H.
    // If I use my formula v -> 0 at bottom. Canvas Y -> H.
    // If I use prompt formula v -> 1 at bottom. Canvas Y -> 0.
    // If Canvas Y -> 0 (Top of image), that contradicts "Bottom 30% of image".
    
    // DECISION: I will use my formula `0.5 + ...` because it correctly maps the bottom of the world (y < 0) to the bottom of the texture image (high Y), which matches my Mock Data generation.
    const v = 0.5 + Math.asin(geometryY) / Math.PI;

    // UV -> Pixel Coords
    // Canvas (0,0) is Top-Left. v=0 is Bottom. v=1 is Top.
    // So pixelY = (1 - v) * height
    const px = Math.floor(u * maskDimensions.width);
    const py = Math.floor((1 - v) * maskDimensions.height);

    // Boundary Check
    if (px < 0 || px >= maskDimensions.width || py < 0 || py >= maskDimensions.height) {
      return false;
    }

    // Pixel Index (RGBA = 4 bytes)
    const index = (py * maskDimensions.width + px) * 4;
    const alpha = floorMaskData[index + 3]; // Alpha channel

    // 255 = Fully Opaque (Masked area), 0 = Transparent
    // 마스킹된 영역이 '유효한 바닥'이라고 가정 (Alpha > 100)
    return alpha > 100;
  };

  // Interaction Plane Logic
  // We use a large invisible plane at floor height to capture pointer events.
  // This removes the artificial "Room Box" limits and allows placing anywhere the mask allows.
  
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // The raycast hits the Plane at floorY.
    // Explicitly use the intersection point.
    const point = e.point;
    setCursorPosition(point);
    
    // PLACE 모드일 때만 검사
    if (mode === 'PLACE') {
      const collision = checkCollision(
        [point.x, point.y, point.z],
        { width: 1, depth: 1 }, // Ghost 크기
        furnitures
      );
      setIsColliding(collision);

      const validFloor = checkFloorValidity(point.x, point.z);
      setIsFloorValid(validFloor);
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (pointerDownPos.current) {
      const deltaX = e.clientX - pointerDownPos.current.x;
      const deltaY = e.clientY - pointerDownPos.current.y;
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 5) {
        pointerDownPos.current = null;
        return;
      }
    }
    
    if (mode === 'PLACE') {
      if (isColliding) {
        console.warn('충돌 감지');
        pointerDownPos.current = null;
        return;
      }

      if (!isFloorValid) {
        console.warn('바닥 유효성 검사 실패');
        pointerDownPos.current = null;
        return;
      }
      
      // Direct use of point (no clamping)
      addFurniture(e.point);
    } else {
      setSelectedFurnitureId(null);
    }
    pointerDownPos.current = null;
  };

  return (
    <>
      {/* Interaction Floor Plane */}
      {/* 
         Use a large plane for raycasting.
         Visible=true for raycasting, but Opacity=0 to be invisible.
         Debug mode can show wireframe.
      */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to be flat (XZ plane)
        position={[0, floorY, 0]} // Fixed at floor height
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial 
          color="pink" 
          visible={true} // Material must be visible to render, but opacity makes it invisible
          wireframe={isDebugMode} // Only show wireframe in debug mode (or make it dependent)
          transparent={true}
          opacity={isDebugMode ? 0.2 : 0} // Completely invisible unless debug
          side={2} 
          depthWrite={false} // Critical: Do not hide objects behind this invisible plane (like FloorOverlay)
        />
      </mesh>

      {/* Ghost Cube for Debugging / Preview - Only visible in PLACE mode */}
      {/* Ghost Model for Preview - Only visible in PLACE mode */}
      {mode === 'PLACE' && (
        <Suspense fallback={
          <mesh position={cursorPosition}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={isColliding ? "red" : "cyan"} transparent opacity={0.5} wireframe />
          </mesh>
        }>
          <GhostFurniture 
            position={cursorPosition} 
            isColliding={isColliding || !isFloorValid} 
          />
        </Suspense>
      )}
    </>
  );
}
