'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: number;
  sender: 'user' | 'gemini';
  text: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'gemini', text: "I notice you have a warm, minimalist aesthetic. I'd recommend a natural linen sofa to complement your space." },
    { id: 2, sender: 'user', text: 'That sounds perfect. What about accent colors?' },
    { id: 3, sender: 'gemini', text: 'Soft terracotta or sage green would beautifully accent your beige palette while maintaining the minimalist vibe.' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { id: messages.length + 1, sender: 'user', text: inputValue }]);
      setInputValue('');
      setTimeout(() => {
        setMessages(prev => [...prev, { id: prev.length + 1, sender: 'gemini', text: "That's a great choice! This piece will complement your space beautifully." }]);
      }, 500);
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
      </div>

      <div className="p-4 border-t border-white/20">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask for recommendations..."
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-gray-400 px-4 py-2 rounded-full text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
