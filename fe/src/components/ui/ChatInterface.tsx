'use client';

export default function ChatInterface() {
  return (
    <div 
      className="absolute right-0 top-0 h-full w-80 bg-black/60 backdrop-blur-md border-l border-white/10 p-4 flex flex-col z-20 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto p-2 text-white/80 space-y-4">
        {/* Chat History Dummy */}
        <div className="bg-white/10 p-3 rounded-lg rounded-tl-none self-start">
          <p className="text-sm">안녕하세요! 어떤 인테리어를 원하시나요?</p>
        </div>
      </div>
      
      <div className="mt-4 flex gap-2">
        <input 
          type="text" 
          placeholder="메시지 입력..." 
          className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">
          Send
        </button>
      </div>
    </div>
  );
}
