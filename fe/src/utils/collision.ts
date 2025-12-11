/**
 * 가구 충돌 감지 유틸리티
 * AABB (Axis-Aligned Bounding Box) 방식으로 2D 평면(X, Z축) 충돌 검사
 */

interface FurnitureSize {
  width: number;
  depth: number;
}

interface FurnitureWithSize {
  position: [number, number, number];
  size: FurnitureSize;
}

/**
 * 새로운 가구 위치가 기존 가구들과 충돌하는지 확인
 * @param newPosition 새 가구의 중심 위치 [x, y, z]
 * @param newSize 새 가구의 크기 { width, depth }
 * @param existingFurnitures 기존에 배치된 가구 목록
 * @returns 충돌 여부 (true: 충돌, false: 충돌 없음)
 */
export function checkCollision(
  newPosition: [number, number, number],
  newSize: FurnitureSize,
  existingFurnitures: FurnitureWithSize[]
): boolean {
  // 새 가구의 경계 계산 (중심점 기준)
  const newMinX = newPosition[0] - newSize.width / 2;
  const newMaxX = newPosition[0] + newSize.width / 2;
  const newMinZ = newPosition[2] - newSize.depth / 2;
  const newMaxZ = newPosition[2] + newSize.depth / 2;

  // 기존 가구들과 충돌 검사
  for (const furniture of existingFurnitures) {
    const existingMinX = furniture.position[0] - furniture.size.width / 2;
    const existingMaxX = furniture.position[0] + furniture.size.width / 2;
    const existingMinZ = furniture.position[2] - furniture.size.depth / 2;
    const existingMaxZ = furniture.position[2] + furniture.size.depth / 2;

    // AABB 충돌 검사: 두 상자가 겹치는지 확인
    const isOverlappingX = newMinX < existingMaxX && newMaxX > existingMinX;
    const isOverlappingZ = newMinZ < existingMaxZ && newMaxZ > existingMinZ;

    // X축과 Z축 모두 겹치면 충돌
    if (isOverlappingX && isOverlappingZ) {
      return true;
    }
  }

  // 모든 가구와 충돌하지 않음
  return false;
}
