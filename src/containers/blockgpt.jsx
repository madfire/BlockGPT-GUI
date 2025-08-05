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
  const responseRef = useRef(null);

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
      setResponse(prev => `${prev}\n\n${content}`);
      setPrompt('');
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

  useEffect(() => {
    if (window.renderMathInElement && responseRef.current) {
      window.renderMathInElement(responseRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  }, [response]);

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
        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          style={{ cursor: 'move' }}
        >
          <button
            onClick={handleToggle}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(to bottom right, #3B82F6, #06B6D4)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <BotMessageSquare size={26} />
          </button>
        </div>

        {open && (
          <div
            style={{
              position: 'fixed',
              bottom: '130px',
              right: '16px',
              width: '360px',
              height: '480px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #3B82F6',
              borderRadius: '12px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(to right, #EFF6FF, #DBEAFE)',
                borderBottom: '1px solid #BFDBFE',
                fontWeight: '600',
                fontSize: '14px',
                color: '#1E40AF'
              }}
            >
              BlockGPT 助手
            </div>

            <div
              ref={responseRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                fontSize: '14px',
                color: '#1F2937',
                backgroundColor: '#ffffff'
              }}
              dangerouslySetInnerHTML={{ __html: window.marked?.parse(response || '👋 请输入你想要生成的内容') || '' }}
            />

            <div
              style={{
                padding: '12px',
                borderTop: '1px solid #BFDBFE',
                backgroundColor: '#ffffff'
              }}
            >
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="请输入提示词..."
                style={{
                  width: '100%',
                  resize: 'none',
                  fontSize: '14px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #93C5FD',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <button
                  onClick={handleToggle}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B7280',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  收起
                </button>
                <button
                  onClick={handleSend}
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#fff',
                    padding: '4px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
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
