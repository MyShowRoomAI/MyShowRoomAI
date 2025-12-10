'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { Settings } from 'lucide-react';

export default function CalibrationPanel() {
  const roomSize = useStore((state) => state.roomSize);
  const setRoomSize = useStore((state) => state.setRoomSize);
  const isDebugMode = useStore((state) => state.isDebugMode);
  const setIsDebugMode = useStore((state) => state.setIsDebugMode);

  return (
    <div 
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="backdrop-blur-md bg-black/60 border border-white/20 rounded-xl p-4 text-white w-72 shadow-xl">
        <div className="flex items-center space-x-2 mb-4 border-b border-white/10 pb-2">
          <Settings size={16} className="text-blue-400" />
          <h3 className="text-sm font-bold">Room Calibration</h3>
        </div>

        <div className="space-y-4">
          {/* Debug Grid Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Floor Guide</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isDebugMode} 
                onChange={(e) => setIsDebugMode(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Width Control */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Width</span>
              <span className="font-mono text-blue-300">{roomSize.width}m</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="30" 
              step="0.5"
              value={roomSize.width}
              onChange={(e) => setRoomSize({ ...roomSize, width: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Depth Control */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Depth</span>
              <span className="font-mono text-blue-300">{roomSize.depth}m</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="30" 
              step="0.5"
              value={roomSize.depth}
              onChange={(e) => setRoomSize({ ...roomSize, depth: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Height Control */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Height</span>
              <span className="font-mono text-blue-300">{roomSize.height}m</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="10" 
              step="0.1"
              value={roomSize.height}
              onChange={(e) => setRoomSize({ ...roomSize, height: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
