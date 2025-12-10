'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ControlBar from '@/components/ui/ControlBar';
import ChatInterface from '@/components/ui/ChatInterface';
import FurnitureSidebar from '@/components/ui/FurnitureSidebar';
import CalibrationPanel from '@/components/ui/CalibrationPanel';
import LandingScreen from '@/components/ui/LandingScreen';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useStore } from '@/store/useStore';

// SSR 방지를 위해 dynamic import 사용
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Home() {
  const textureUrl = useStore((state) => state.textureUrl);
  const isLoading = useStore((state) => state.isLoading);
  const setIsLoading = useStore((state) => state.setIsLoading);
  
  // 로딩 진행률 (0~100)
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 로딩 시뮬레이션 (추후 실제 백엔드 연동 시 교체)
  useEffect(() => {
    if (isLoading && textureUrl) {
      setLoadingProgress(0);
      
      const simulateAsyncOperations = async () => {
        // Step 1: 분석 시작 (0 ~ 30%)
        await new Promise(r => setTimeout(r, 1000));
        setLoadingProgress(30);
        
        // Step 2: 스타일 매칭 (30 ~ 60%)
        await new Promise(r => setTimeout(r, 1500));
        setLoadingProgress(60);
        
        // Step 3: 가구 배치 시뮬레이션 (60 ~ 90%)
        await new Promise(r => setTimeout(r, 1500));
        setLoadingProgress(90);
        
        // Step 4: 렌더링 준비 및 3D Scene 초기화 대기 (90 ~ 100%)
        // 여기서 실제 리소스 로딩이 완료되기를 기다리는 의미로 시간을 둠
        await new Promise(r => setTimeout(r, 1000));
        setLoadingProgress(100);
        
        // 완료 후 잠시 대기했다가 로딩 화면 제거
        setTimeout(() => {
            setIsLoading(false);
        }, 500);
      };

      simulateAsyncOperations();
    }
  }, [isLoading, textureUrl, setIsLoading]);

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
          <LoadingScreen loadingProgress={loadingProgress} />
        </div>
      )}

      {/* UI Layer (Foreground) - 로딩이 끝난 후에만 표시 */}
      {!isLoading && (
        <div className="absolute inset-0 z-20 pointer-events-none animate-fade-in">
          <CalibrationPanel />
          <FurnitureSidebar />
          <ControlBar />
          <ChatInterface />
        </div>
      )}
    </main>
  );
}
