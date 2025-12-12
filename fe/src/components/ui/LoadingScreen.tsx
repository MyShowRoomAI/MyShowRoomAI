'use client';

import React, { useState, useEffect } from 'react';

// Props: 로딩이 끝났을 때 실행할 콜백 함수
interface LoadingProps {
  onComplete?: () => void; // Optional now, since parent controls flow mostly
  loadingProgress?: number; // 0 to 100
  variant?: 'full' | 'overlay'; // full: 초기 로딩, overlay: 작업 중 로딩
}

import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ loadingProgress = 0, variant = 'full' }: LoadingProps) {
  // progress state removed, using prop directly
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Analyzing Space", description: "Analyzing room dimensions and layout" },
    { title: "Style Matching", description: "Matching user preferences with styles" },
    { title: "Furniture AI", description: "Simulating optimal furniture placement" },
    { title: "Rendering", description: "Generating 3D showroom" }
  ];

  // progress에 따라 단계 계산 (0~25: 0, 26~50: 1, 51~75: 2, 76~100: 3)
  useEffect(() => {
    const stepIndex = Math.min(Math.floor(loadingProgress / 25), steps.length - 1);
    setCurrentStep(stepIndex);
  }, [loadingProgress]);

  // Variant: Overlay (Simple Blur + Spinner)
  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fade-in">
        <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center transform scale-110">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
            <p className="text-xl font-bold tracking-wide">AI is processing...</p>
            <p className="text-sm text-gray-300 mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Variant: Full (Original Intro)
  return (
    <div className="min-h-screen w-full overflow-hidden bg-white relative flex items-center justify-center font-sans">
       <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 50%, #f8fafc 0%, #e2e8f0 100%)' }} />
       <div className="relative z-10 w-full max-w-3xl px-6 py-10 flex flex-col items-center">
          <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[400px] relative transition-transform duration-700 hover:scale-105 mb-8">
             <svg viewBox="0 0 500 400" className="w-full h-full drop-shadow-2xl">
                {/* 3D Wireframe Room Concept SVG */}
                <defs>
                  <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Perspective Floor Grid */}
                <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                  <path d="M100 300 L250 200 L400 300 L250 400 Z" fill="none" stroke="url(#grid-grad)" strokeWidth="1" opacity="0.3" />
                  <line x1="175" y1="250" x2="325" y2="350" stroke="url(#grid-grad)" strokeWidth="0.5" opacity="0.2" />
                  <line x1="325" y1="250" x2="175" y2="350" stroke="url(#grid-grad)" strokeWidth="0.5" opacity="0.2" />
                </g>

                {/* Animated Room Wireframes */}
                <g filter="url(#glow)">
                    {/* Walls */}
                    <path d="M100 300 L100 150 L250 50 L250 200 Z" fill="rgba(99, 102, 241, 0.05)" stroke="#6366f1" strokeWidth="2" className="animate-[dash_3s_linear_infinite]" strokeDasharray="1000" strokeDashoffset="1000">
                        <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="2s" fill="freeze" />
                    </path>
                    <path d="M400 300 L400 150 L250 50 L250 200 Z" fill="rgba(139, 92, 246, 0.05)" stroke="#8b5cf6" strokeWidth="2" className="animate-[dash_3s_linear_infinite]" strokeDasharray="1000" strokeDashoffset="1000">
                        <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="2s" begin="0.5s" fill="freeze" />
                    </path>
                </g>

                {/* Scanning Effect */}
                <line x1="0" y1="0" x2="500" y2="0" stroke="#bef264" strokeWidth="2" opacity="0.5">
                    <animateTransform attributeName="transform" type="translate" from="0 0" to="0 400" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;0.8;0" dur="1.5s" repeatCount="indefinite" />
                </line>

                {/* Central AI Logic Node */}
                <circle cx="250" cy="200" r="5" fill="#fff">
                    <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                </circle>
             </svg>
          </div>
          
          <div className="mt-4 text-center h-20">
            <h2 className="text-2xl font-bold text-slate-800 transition-all duration-300">
                {loadingProgress === 100 ? "Ready to Explore!" : steps[currentStep].title}
            </h2>
            <p className="text-slate-500 mt-2 text-sm transition-all duration-300">
                {loadingProgress === 100 ? "Your space is ready." : steps[currentStep].description}
            </p>
          </div>
          <div className="w-full max-w-md h-2 bg-slate-100 rounded-full mt-4 overflow-hidden relative">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out relative" style={{ width: `${loadingProgress}%` }}>
                <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-white/30 to-transparent" />
            </div>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-400 font-mono">
            SYSTEM LOADING... {Math.floor(loadingProgress)}%
          </div>
       </div>
    </div>
  );
}
