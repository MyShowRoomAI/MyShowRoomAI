'use client';

import React, { useState } from 'react';
import { Cloud, Upload, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function LandingScreen() {
  const setTextureUrl = useStore((state) => state.setTextureUrl);
  const setUserPrompt = useStore((state) => state.setUserPrompt);
  const setIsLoading = useStore((state) => state.setIsLoading);
  const setOriginalImageFile = useStore((state) => state.setOriginalImageFile);

  const [hasImage, setHasImage] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // 로컬 isLoading 제거, 전역 상태 사용

  // 로컬 State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setHasImage(true);
    // Store에 원본 파일 저장 (API 호출 시 사용)
    setOriginalImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPrompt(text);
    setHasText(text.trim().length > 0);
  };

  const handleEnterShowroom = () => {
    if (!previewUrl) return;
    
    // 1. 로딩 시작
    setIsLoading(true);
    
    // 2. 데이터 세팅 (약간의 지연 없이 바로 세팅해도 무방, 순서는 로딩 먼저)
    setTextureUrl(previewUrl);
    setUserPrompt(prompt);
  };

  const isButtonActive = hasImage && hasText;

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white relative">
      {/* 배경 이미지 및 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,247,255,0.92) 50%, rgba(240,245,255,0.95) 100%),
            radial-gradient(ellipse 100% 100% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* 미묘한 패턴 */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 24%, rgba(99,102,241,0.03) 25%, rgba(99,102,241,0.03) 26%, transparent 27%, transparent 74%, rgba(99,102,241,0.03) 75%, rgba(99,102,241,0.03) 76%, transparent 77%, transparent),
            linear-gradient(0deg, transparent 24%, rgba(99,102,241,0.03) 25%, rgba(99,102,241,0.03) 26%, transparent 27%, transparent 74%, rgba(99,102,241,0.03) 75%, rgba(99,102,241,0.03) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px',
        }} />

        {/* 장식용 그라데이션 블롭 */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{animationDelay: '2s'}} />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-20">
        {/* 헤더 영역 */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
            MyShow Room AI
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 font-light tracking-wide">
            Transform Your Room Into an AI-Powered Showroom
          </p>
        </div>

        {/* 입력 영역 */}
        <div className="w-full max-w-2xl space-y-8">
          {/* 이미지 업로드 영역 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                : hasImage
                ? 'border-green-400 bg-green-50 shadow-md'
                : 'border-gray-300 bg-gradient-to-br from-blue-50 to-purple-50 hover:border-blue-400 hover:shadow-md'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
            />
            
            <div className="flex flex-col items-center space-y-4">
              {hasImage ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400 rounded-full blur-lg opacity-50" />
                    <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-4 text-white">
                      <Upload size={32} />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-700">Room photo uploaded!</p>
                    <p className="text-sm text-green-600 mt-1">360° photo registered.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-lg opacity-40" />
                    <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4 text-white">
                      <Cloud size={32} />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-800">Upload Your 360° Room Photo</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Drag and drop your image here or click to upload
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 텍스트 입력 영역 */}
          <div className="relative">
            <textarea
              onChange={handleTextChange}
              placeholder="What style would you like? Example: Warm Scandinavian design, budget $10,000"
              className="w-full h-32 p-6 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none resize-none font-medium text-gray-800 placeholder-gray-400 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:border-gray-300 focus:shadow-lg focus:shadow-blue-200/50"
            />
            <div className="absolute bottom-4 right-4 text-xs text-gray-400">
              AI analyzes your preferences
            </div>
          </div>

          {/* 메인 버튼 */}
          <div className="pt-4">
            <button
              disabled={!isButtonActive}
              onClick={handleEnterShowroom}
              className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                isButtonActive
                  ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <span>Enter AI Showroom</span>
                {isButtonActive && <span className="text-xl">✨</span>}
              </span>
            </button>
            {!isButtonActive && (
              <p className="text-center text-sm text-gray-500 mt-3">
                Please upload a photo and describe your style
              </p>
            )}
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="mt-16 text-center text-sm text-gray-600 space-y-2">
          <p className="flex items-center justify-center space-x-2">
            <span className="w-1 h-1 bg-blue-500 rounded-full" />
            <span>AI analyzes your room and recommends perfect furniture</span>
          </p>
          <p className="flex items-center justify-center space-x-2">
            <span className="w-1 h-1 bg-purple-500 rounded-full" />
            <span>Preview your interior design with real-time 3D simulation</span>
          </p>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
