import { Object3D, Box3, Vector3 } from 'three';

/**
 * 3D 모델을 목표 크기에 맞춰 스케일을 조정하고, 
 * 바닥점(min Y)을 0으로, 중심점(Center X/Z)을 0으로 맞춥니다.
 * 
 * @param object 대상 3D Object (Group or Scene)
 * @param targetSize 목표 크기 (미터 단위, 기본값 1.5m)
 */
export const normalizeModel = (object: Object3D, targetSize: number = 1.5) => {
  // 1. 초기 Bounding Box 계산
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);
  
  const maxDim = Math.max(size.x, size.y, size.z);
  
  // 크기가 0이거나 유효하지 않으면 무시
  if (maxDim <= 0.001) return;

  // 2. 스케일 계산 (목표 크기 / 현재 최대 크기)
  const scaleFactor = targetSize / maxDim;
  object.scale.setScalar(scaleFactor);

  // 3. 위치 보정 (Centering)
  // 중심점을 (0,0,0)으로 이동
  const center = new Vector3();
  box.getCenter(center);
  
  object.position.x = -center.x * scaleFactor;
  object.position.y = -center.y * scaleFactor; // Y축도 중심으로 정렬
  object.position.z = -center.z * scaleFactor;

  // Update Matrix to apply changes immediately if needed
  object.updateMatrix();
};
