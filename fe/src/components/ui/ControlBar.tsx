'use client';

import { useStore } from '@/store/useStore';

export default function ControlBar() {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const setTextureUrl = useStore((state) => state.setTextureUrl);

  const modes = ['VIEW', 'PLACE', 'REMOVE'] as const;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create Blob URL for preview
    const objectUrl = URL.createObjectURL(file);
    setTextureUrl(objectUrl);
  };

  return (
    <div 
      className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md p-4 rounded-full flex gap-4 shadow-xl z-20 pointer-events-auto"
      onClick={(e) => e.stopPropagation()} // 이벤트 버블링 방지
    >
      {/* Upload Button */}
      <label className="cursor-pointer px-6 py-2 rounded-full font-bold bg-green-600 hover:bg-green-500 text-white transition-all flex items-center gap-2">
        <span>Upload</span>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileUpload}
        />
      </label>

      {/* Mode Buttons */}
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`px-6 py-2 rounded-full font-bold transition-all ${
            mode === m 
              ? 'bg-white text-black scale-105 shadow-lg' 
              : 'bg-transparent text-white hover:bg-white/20'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
