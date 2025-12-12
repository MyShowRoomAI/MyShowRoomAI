'use client';

import { useStore } from '@/store/useStore';
import { BackSide, Texture, NearestFilter } from 'three';
import { useEffect, useState } from 'react';

function FloorOverlayMesh({ url }: { url: string }) {
  const setFloorMaskData = useStore((state) => state.setFloorMaskData);
  const mode = useStore((state) => state.mode);
  const [texture, setTexture] = useState<Texture | null>(null);

  // Manual Image Loading & Data Extraction
  useEffect(() => {
    const img = new Image();
    // Only set crossOrigin if it's a network URL (not data: uri)
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.src = url;
    
    img.onload = () => {
      console.log('FloorOverlay: Image loaded', img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        // Save to Store for InvisibleRoom logic
        setFloorMaskData(imageData.data, img.width, img.height);
        
        // Create Texture
        const tex = new Texture(canvas);
        tex.needsUpdate = true;
        // NearestFilter keeps edges sharp for masks
        tex.minFilter = NearestFilter;
        tex.magFilter = NearestFilter;
        setTexture(tex);
      }
    };
    
    img.onerror = (err) => {
      console.error('FloorOverlay: Failed to load mask image', err);
    };
  }, [url, setFloorMaskData]);

  if (!texture) return null;

  // Opacity Logic
  const opacity = mode === 'PLACE' ? 0.3 : 0.1;

  return (
    <mesh scale={[-1, 1, 1]} frustumCulled={false} renderOrder={1}>
      <sphereGeometry args={[490, 64, 32]} />
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        opacity={opacity} 
        side={BackSide} 
        depthWrite={false} 
        depthTest={true} 
      />
    </mesh>
  );
}

export default function FloorOverlay() {
  const floorMaskUrl = useStore((state) => state.floorMaskUrl);

  if (!floorMaskUrl) {
    return null;
  }

  return <FloorOverlayMesh url={floorMaskUrl} />;
}
