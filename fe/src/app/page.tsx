'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ControlBar from '@/components/ui/ControlBar';
import ChatInterface from '@/components/ui/ChatInterface';
import FurnitureSidebar from '@/components/ui/FurnitureSidebar';
import LandingScreen from '@/components/ui/LandingScreen';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useStore } from '@/store/useStore';

// SSR 방지를 위해 dynamic import 사용
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Home() {
  const textureUrl = useStore((state) => state.textureUrl);
  const isLoading = useStore((state) => state.isLoading);
  const setIsLoading = useStore((state) => state.setIsLoading);
  
  // 초기 로딩 완료 여부
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // 로딩 진행률 (0~100) - 초기 로딩용
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 텍스처가 로드되면 초기 로딩 프로세스 진행
  useEffect(() => {
    if (textureUrl && !isInitialLoadDone) {
      // 초기 로딩 시뮬레이션
      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setIsInitialLoadDone(true);
        }, 300);
      }, 500);
    }
    // Note: 이미 isInitialLoadDone이면 isLoading 상태는 PanoramaSphere 등이 직접 제어함
  }, [textureUrl, isInitialLoadDone, setIsLoading]);

  // Case 1: 이미지가 없으면 랜딩 페이지
  if (!textureUrl) {
    return <LandingScreen />;
  }

  // Case 2 & 3: 이미지가 있으면 Scene은 항상 렌더링 (Pre-rendering)
  // isLoading일 때만 LoadingScreen을 위에 덮어씌움 (Overlay)
  return (
    <main className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* 3D Scene Layer (Always rendered if textureUrl exists) */}
      <div className="absolute inset-0 z-0 text-white">
        <Scene />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50">
          <LoadingScreen 
            loadingProgress={loadingProgress} 
            variant={!isInitialLoadDone ? 'full' : 'overlay'} 
          />
        </div>
      )}

      {/* UI Layer (Foreground) - 로딩이 끝난 후에만 표시 */}
      {!isLoading && (
        <div className="absolute inset-0 z-20 pointer-events-none animate-fade-in">
          <FurnitureSidebar />
          <ControlBar />
          <ChatInterface />
        </div>
      )}
    </main>
  );
}
