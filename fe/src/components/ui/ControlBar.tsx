'use client';

import React from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function ControlBar() {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);

  return (
    <div 
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-2 py-3 flex items-center space-x-2 shadow-2xl">
        <button
          onClick={() => setMode('VIEW')}
          className={`p-3 rounded-full transition-all duration-300 ${
            mode === 'VIEW'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="View Mode"
        >
          <Eye size={20} />
        </button>

        <div className="w-px h-6 bg-white/20" />

        <button
          onClick={() => setMode('PLACE')}
          className={`p-3 rounded-full transition-all duration-300 ${
            mode === 'PLACE'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Place Furniture"
        >
          <Plus size={20} />
        </button>

        <div className="w-px h-6 bg-white/20" />

        <button
          onClick={() => setMode('REMOVE')}
          className={`p-3 rounded-full transition-all duration-300 ${
            mode === 'REMOVE'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Remove Object"
        >
          <Trash2 size={20} />
        </button>

      </div>

      {/* Mode Indicator */}
      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-4 py-2 whitespace-nowrap">
        <p className="text-sm text-white font-medium">
          Mode: <span className="text-blue-400 font-bold capitalize drop-shadow-md">{mode.toLowerCase()}</span>
        </p>
      </div>
    </div>
  );
}
