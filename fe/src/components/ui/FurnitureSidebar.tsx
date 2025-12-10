'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
// import { FURNITURE_DATA } from '@/data/mockData'; // Remove hardcoded import

export default function FurnitureSidebar() {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const setMode = useStore((state) => state.setMode);
  const furnitureList = useStore((state) => state.currentFurnitureList); // 동적 목록 사용

  const handleCardClick = (idx: number, name: string) => {
    setActiveCard(idx);
    setMode('PLACE');
    console.log(`Selected: ${name}`);
  };

  return (
    <div 
      className="absolute left-0 top-0 bottom-0 w-72 z-20 p-6 overflow-y-auto pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-6 drop-shadow-md">Recommended</h2>
        
        {furnitureList.length === 0 ? (
          <div className="text-white text-base text-center py-12 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg">
            <p className="font-semibold text-lg">👋 Hello!</p>
            <p className="mt-3 text-gray-100 leading-relaxed">
              Please request a style<br/>via chat.
            </p>
            <div className="mt-5 text-sm text-blue-300 font-medium bg-blue-500/10 py-1.5 px-4 rounded-full border border-blue-400/20 w-fit mx-auto">
              Ex: "Design a modern living room"
            </div>
          </div>
        ) : (
          furnitureList.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => handleCardClick(idx, item.name)}
            className={`p-4 rounded-2xl backdrop-blur-md cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              activeCard === idx
                ? 'bg-white/20 border border-blue-400/50 shadow-lg shadow-blue-500/30'
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="text-5xl">{item.image}</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                <p className="text-xs text-gray-300 mt-1">{item.desc}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-lg font-bold text-blue-300">{item.price}</span>
                  <button className="text-xs bg-blue-500/80 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors">
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}
