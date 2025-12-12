'use client';

import { useStore } from '@/store/useStore';
import { Line } from '@react-three/drei';
import { useMemo } from 'react';

export default function FloorBoundaryLine() {
  const floorBoundary = useStore((state) => state.floorBoundary);
  const imageSize = useStore((state) => state.imageSize);
  const roomSize = useStore((state) => state.roomSize);

  // 2D 이미지 좌표를 3D 공간 좌표로 변환
  const points3D = useMemo(() => {
    if (!floorBoundary || floorBoundary.length === 0 || !imageSize) return [];

    const { width: imageWidth, height: imageHeight } = imageSize;

    return floorBoundary.map(({ x, y }) => {
      // 정규화 (0~1 범위로)
      const normalizedX = x / imageWidth;
      const normalizedY = y / imageHeight;

      // 구형 좌표로 변환 (equirectangular projection)
      const phi = normalizedY * Math.PI; // 위아래 (0 ~ π): 0=천장, π=바닥
      const theta = (normalizedX - 0.5) * 2 * Math.PI; // 좌우 (-π ~ π)

      // 3D 좌표 계산 (구의 반지름을 roomSize 기준으로)
      const radius = Math.max(roomSize.width, roomSize.depth, roomSize.height) / 2 - 0.1;
      const x3d = radius * Math.sin(phi) * Math.sin(theta);
      const y3d = radius * Math.cos(phi);
      const z3d = radius * Math.sin(phi) * Math.cos(theta);

      return [x3d, y3d, z3d] as [number, number, number];
    });
  }, [floorBoundary, imageSize, roomSize]);

  if (!floorBoundary || points3D.length === 0) {
    return null;
  }

  return (
    <Line
      points={points3D}
      color="red"
      lineWidth={3}
      dashed={false}
    />
  );
}
