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

  // 3. 위치 보정 (Centering & Grounding)
  // 스케일이 적용된 후의 위치를 다시 계산해야 하므로, 
  // Object의 위치를 일단 (0,0,0)으로 두고 재계산 논리 적용이 필요하지만,
  // Three.js에서는 부모의 스케일이 자식에게 영향을 주므로
  // 여기서는 모델(자식)을 감싸는 Group을 조정하거나, 모델 자체의 Position을 역보정해야 함.
  
  // 간단한 방식: 모델 자체를 이동시켜서 시각적으로 (0,0,0)에 오게 함.
  // 주의: 이미 스케일이 적용되었으므로, 오프셋도 스케일을 고려해야 함.
  
  // Bounding Box Center & Min
  const center = new Vector3();
  box.getCenter(center);
  
  // 현재 중심점에서 원점까지의 거리 역산
  // (Center * Scale) 만큼 이동하면 0점이 됨.
  // 단, Y축은 Min Y가 0이 되어야 함.
  
  object.position.x = -center.x * scaleFactor;
  object.position.y = -box.min.y * scaleFactor;
  object.position.z = -center.z * scaleFactor;

  // Update Matrix to apply changes immediately if needed
  object.updateMatrix();
};
