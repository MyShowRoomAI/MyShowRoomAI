'use client';

import { useState, MouseEvent as ReactMouseEvent } from 'react';
import { useTexture, Html } from '@react-three/drei';
import { BackSide, Vector3 } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { removeObject } from '@/api/apiClient';

// Helper to convert base64 to File object
const base64ToFile = (base64Str: string, filename: string): File => {
  const arr = base64Str.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// 3D Selection Pointer Component (Pin Shape)
function SelectionPointer() {
    return (
        <group>
            {/* Pin Head (Sphere) */}
            <mesh position={[0, 10, 0]}>
                <sphereGeometry args={[4, 32, 32]} />
                <meshStandardMaterial 
                    color="#ef4444" 
                    emissive="#991b1b"
                    emissiveIntensity={0.5}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>
            {/* Pin Body (Cone) */}
            <mesh position={[0, 5, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[2, 10, 32]} />
                <meshStandardMaterial 
                    color="#ef4444" 
                    emissive="#991b1b"
                    emissiveIntensity={0.5}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>
            {/* Optional: Simple shadow/base ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                <ringGeometry args={[1, 3, 32]} />
                <meshBasicMaterial color="black" transparent opacity={0.3} side={2} />
            </mesh>
        </group>
    )
}

export default function PanoramaSphere() {
  const mode = useStore((state) => state.mode);
  const textureUrl = useStore((state) => state.textureUrl);
  const originalImageFile = useStore((state) => state.originalImageFile);
  const setTextureUrl = useStore((state) => state.setTextureUrl);
  const setOriginalImageFile = useStore((state) => state.setOriginalImageFile);
  const setIsLoading = useStore((state) => state.setIsLoading);

  const texture = useTexture(textureUrl!);

  // State for selection logic
  const [selectedPoint, setSelectedPoint] = useState<{ point: Vector3; x: number; y: number } | null>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode !== 'REMOVE') return;
    
    e.stopPropagation();
    
    // UV coordinates: u (0..1), v (0..1)
    const uv = e.uv;
    if (!uv) return;

    // Get real image dimensions from the loaded texture
    const imageWidth = texture.image.width;
    const imageHeight = texture.image.height;

    // Convert UV to Pixel Coordinates
    // Note: sphere UV mapping might need horizontal flip (1-u) depending on geometry
    // Standard primitive scale=[-1,1,1] inside out often needs x correction if not aligned. 
    // Usually standard equirectangular: u=0 at -z (back), 0.25 at +x (right), etc.
    // Let's assume standard mapping first.
    
    const x = Math.floor(uv.x * imageWidth);
    const y = Math.floor((1 - uv.y) * imageHeight); // Y is usually inverted in texture coords

    console.log(`Clicked UV: (${uv.x.toFixed(4)}, ${uv.y.toFixed(4)}) -> Px: (${x}, ${y})`);

    setSelectedPoint({
      point: e.point.clone(),
      x,
      y
    });
  };

  const handleConfirmRemove = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!selectedPoint || !originalImageFile) {
        console.error("No point selected or original file missing");
        return;
    }

    try {
      setIsLoading(true);
      const { x, y } = selectedPoint;
      
      const response = await removeObject(originalImageFile, x, y);

      if (response.status === 'success' && response.image) {
        // 1. Update Texture (Base64 directly works for Three.js texture loader usually, or ObjectURL)
        // Ensure prefix exists
        const base64Image = response.image.startsWith('data:image') 
            ? response.image 
            : `data:image/png;base64,${response.image}`;
            
        // 2. Convert to File for next operation (Recursive removal)
        const newFile = base64ToFile(base64Image, 'edited_room.png');
        setOriginalImageFile(newFile);
        
        // 3. Update Store to trigger re-render
        // Small note: createObjectURL ensures fresh URL for loader
        // But base64 string can also be passed to setTextureUrl if the loader supports it.
        // For consistency/memory, let's use the object URL of the new file? 
        // Or just the base64 string. useTexture supports data URIs.
        setTextureUrl(base64Image); 

        // Close modal
        setSelectedPoint(null);
      }
    } catch (error) {
      console.error("Failed to remove object:", error);
      alert("가구 삭제에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setSelectedPoint(null);
  };

  return (
    <group>
        <mesh 
            scale={[-1, 1, 1]} 
            onClick={handleClick}
            onPointerOver={() => mode === 'REMOVE' && (document.body.style.cursor = 'crosshair')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
            <sphereGeometry args={[500, 60, 40]} />
            <meshBasicMaterial map={texture} side={BackSide} />
        </mesh>

        {/* Selection Marker & Modal */}
        {selectedPoint && mode === 'REMOVE' && (
            <group position={selectedPoint.point}>
                {/* 3D Pointer Component */}
                <SelectionPointer />

                {/* UI Overlay - Positioned higher to float above the pointer */}
                <Html position={[0, 40, 0]} center zIndexRange={[100, 0]}>
                    <div style={{ transform: 'translate3d(0, -50%, 0) translateY(-20px)' }}>
                        <div 
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                                background: 'rgba(0,0,0,0.85)', 
                                padding: '16px 20px', 
                                borderRadius: '12px', 
                                backdropFilter: 'blur(8px)',
                                color: 'white',
                                textAlign: 'center',
                                minWidth: '220px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                animation: 'fadeInUp 0.3s ease-out forwards'
                            }}
                        >
                            <style>{`
                                @keyframes fadeInUp {
                                    from { opacity: 0; transform: translateY(10px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                            `}</style>
                            <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 500 }}>이 가구를 지우시겠습니까?</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button 
                                    onClick={handleConfirmRemove}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                                >
                                    삭제하기
                                </button>
                                <button 
                                    onClick={handleCancel}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #525252',
                                        background: 'transparent',
                                        color: '#e5e5e5',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        transition: 'border-color 0.2s, color 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#a3a3a3';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#525252';
                                        e.currentTarget.style.color = '#e5e5e5';
                                    }}
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                </Html>
            </group>
        )}
    </group>
  );
}
