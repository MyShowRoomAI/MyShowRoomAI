'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { fetchAiDesignResponse } from '@/api/apiClient';

interface Message {
  id: number;
  sender: 'user' | 'gemini';
  text: string;
}

export default function ChatInterface() {
  const messages = useStore((state) => state.messages);
  const addMessage = useStore((state) => state.addMessage);
  const setFurnitureList = useStore((state) => state.setFurnitureList);
  const originalImageFile = useStore((state) => state.originalImageFile);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 로컬 로딩 상태 (Chat 전용)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // 유효성 검사: 원본 이미지 파일 확인
    if (!originalImageFile) {
      addMessage({ sender: 'gemini', text: 'No original image found. Please upload an image first.' });
      return;
    }

    // 1. 사용자 메시지 추가
    const userMsg = inputValue;
    addMessage({ sender: 'user', text: userMsg });
    setInputValue('');
    setIsLoading(true);

    try {
      // 2. 실제 API 호출
      const response = await fetchAiDesignResponse(userMsg, originalImageFile);

      // 3. AI 응답 처리
      addMessage({ sender: 'gemini', text: response.ai_message });
      
      // 4. 가구 목록 업데이트
      setFurnitureList(response.new_furniture_items);
      
    } catch (error) {
      console.error("API Error:", error);
      addMessage({ sender: 'gemini', text: "API Error. Please check the URL and network connection." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="absolute right-0 top-0 bottom-0 w-80 z-20 backdrop-blur-xl bg-white/10 border-l border-white/20 flex flex-col pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
            G
          </div>
          <div>
            <h3 className="text-white font-semibold">Gemini AI</h3>
            <p className="text-xs text-gray-400">Design Assistant</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-500/80 text-white rounded-br-none'
                  : 'bg-white/15 text-gray-100 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white/15 text-gray-100 px-4 py-2 rounded-2xl rounded-bl-none text-sm animate-pulse">
               Thinking...
             </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/20">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask for recommendations..."
            disabled={isLoading}
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-gray-400 px-4 py-2 rounded-full text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors disabled:bg-gray-500"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
