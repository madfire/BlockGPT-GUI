// src/components/blockgpt.jsx
import React, { useState, useRef, useEffect } from 'react';
import { BotMessageSquare } from 'lucide-react';

const BlockGPT = () => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ bottom: 80, right: 20 });
  const dragRef = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const handleToggle = () => setOpen(!open);

  const handleSend = async () => {
    if (!prompt) return;
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-e84aeed6506a4cc78317cfabdf969ad5'
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '无有效返回';
      setResponse(content);
    } catch (err) {
      setResponse('请求失败，请检查网络或接口。');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - offset.current.x;
    const dy = e.clientY - offset.current.y;
    setPosition((prev) => ({
      bottom: Math.max(0, prev.bottom - dy),
      right: Math.max(0, prev.right - dx),
    }));
    offset.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <div ref={dragRef} onMouseDown={handleMouseDown} className="cursor-move">
          <button
            className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-xl hover:brightness-110"
            onClick={handleToggle}
          >
            <BotMessageSquare size={26} />
          </button>
        </div>

        {open && (
          <div className="fixed bottom-[130px] right-4 w-[360px] h-[480px] bg-white border border-blue-600 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center px-4 py-2 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <span className="font-semibold text-blue-700 text-sm">BlockGPT 助手</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap bg-blue-50">
              <div className="p-2 rounded-md bg-white shadow-inner border border-blue-100">
                {response || '👋 请输入你想要生成的内容'}
              </div>
            </div>

            <div className="p-3 border-t border-blue-200 bg-white">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="请输入提示词..."
                className="w-full resize-none text-sm p-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex justify-between mt-2">
                <button
                  onClick={handleToggle}
                  className="text-gray-500 text-sm hover:underline"
                >
                  收起
                </button>
                <button
                  onClick={handleSend}
                  className="bg-blue-600 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-700"
                >
                  {loading ? '生成中…' : '发送'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockGPT;
