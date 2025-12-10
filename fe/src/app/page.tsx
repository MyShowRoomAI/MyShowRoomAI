'use client';

import dynamic from 'next/dynamic';
import ControlBar from '@/components/ui/ControlBar';
import ChatInterface from '@/components/ui/ChatInterface';
import LandingScreen from '@/components/ui/LandingScreen';
import { useStore } from '@/store/useStore';

// SSR 방지를 위해 dynamic import 사용
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Home() {
  const textureUrl = useStore((state) => state.textureUrl);

  // 이미지가 없으면 랜딩 페이지를 보여줌
  if (!textureUrl) {
    return <LandingScreen />;
  }

  return (
    <main className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* 3D Scene Layer (Background) */}
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>

      {/* UI Layer (Foreground) */}
      {/* pointer-events-none을 줘서 UI 빈 공간 클릭이 뒤쪽 Scene으로 전달되게 함. */}
      {/* 각 UI 컴포넌트 내부에서 pointer-events-auto로 상호작용 활성화 */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <ControlBar />
        <ChatInterface />
      </div>
    </main>
  );
}
