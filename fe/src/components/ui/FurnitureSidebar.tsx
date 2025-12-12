'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { FurnitureItem } from '@/data/mockData';

export default function FurnitureSidebar() {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const setMode = useStore((state) => state.setMode);
  const furnitureList = useStore((state) => state.currentFurnitureList); // 동적 목록 사용

  const setSelectedRecommendation = useStore((state) => state.setSelectedRecommendation);

  const handleCardClick = (idx: number, item: FurnitureItem) => {
    setActiveCard(idx);
    setSelectedRecommendation(item);
    setMode('PLACE');
    console.log(`Selected: ${item.name}`);
  };

  return (
    <>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
      <div 
        className="absolute left-0 top-0 bottom-0 w-80 z-20 p-6 overflow-y-auto pointer-events-auto custom-scrollbar bg-gradient-to-r from-black/80 to-transparent mask-image-linear-to-b"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6 pt-4">
          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md tracking-tight">Recommended</h2>
          
          {furnitureList.length === 0 ? (
            <div className="text-white text-base text-center py-12 px-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="font-semibold text-lg text-blue-200">✨ AI Assistant</p>
              <p className="mt-3 text-gray-300 leading-relaxed text-sm">
                Please request a style via chat.<br/>AI will find matching furniture for you.
              </p>
              <div className="mt-6 text-xs text-blue-300 font-medium bg-blue-500/20 py-2 px-4 rounded-xl border border-blue-400/20 inline-block">
                Ex: "Design a modern living room"
              </div>
            </div>
          ) : (
            furnitureList.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(idx, item)}
              className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${
                activeCard === idx
                  ? 'bg-white/20 border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.02]'
                  : 'bg-black/30 border-white/10 hover:bg-black/50 hover:scale-[1.01]'
              } border backdrop-blur-xl`}
            >
              {activeCard === idx && (
                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
              )}
              
              <div className="p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center text-4xl shadow-inner shrink-0">
                  {item.image}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-100 truncate pr-2 group-hover:text-white transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-end mt-3">
                    <span className="text-sm font-bold text-blue-300">{item.price}</span>
                    <button className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all duration-300 ${
                       activeCard === idx 
                       ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' 
                       : 'bg-white/10 text-gray-300 group-hover:bg-white/20'
                    }`}>
                      {activeCard === idx ? 'Placed' : 'Place'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )))}
        </div>
      </div>
    </>
  );
}
