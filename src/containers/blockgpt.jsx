import React, { useState, useRef, useEffect } from 'react';
import { BotMessageSquare } from 'lucide-react';

const BlockGPT = () => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ bottom: 80, right: 20 });
  const dragRef = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const responseRef = useRef(null);

  const handleToggle = () => setOpen(!open);

  const handleSend = async () => {
    if (!prompt) return;
    const userMessage = { role: 'user', content: prompt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-e84aeed6506a4cc78317cfabdf969ad5'
        },
        body: JSON.stringify({
          model: 'qwen-plus-2025-07-28',
          messages: [
          {
            role: 'system',
            content: `你是一个图形化编程助手，请根据用户的自然语言需求，返回对应的 Blockly XML 结构的积木代码。
          请只返回 <block>...</block> 的积木结构，不要附加说明文字、标签或注释。

          以下是参考示例：

          Q: 屏幕显示红色背景。
          A:
          <block type="microPython_screen_screenInit">
            <next>
              <block type="microPython_screen_screenShow">
                <field name="COLOR">RED</field>
              </block>
            </next>
          </block>

          Q: 上下左右控制运动。
          A:
          <block type="event_whenflagclicked">
            <next>
              <block type="control_forever">
                <statement name="SUBSTACK">
                  <block type="control_if">
                    <value name="CONDITION">
                      <block type="sensing_keypressed">
                        <value name="KEY_OPTION">
                          <shadow type="sensing_keyoptions">
                            <field name="KEY_OPTION">left arrow</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <statement name="SUBSTACK">
                      <block type="motion_changexby">
                        <value name="DX">
                          <shadow type="math_number">
                            <field name="NUM">-10</field>
                          </shadow>
                        </value>
                      </block>
                    </statement>
                    <next>
                      <block type="control_if">
                        <value name="CONDITION">
                          <block type="sensing_keypressed">
                            <value name="KEY_OPTION">
                              <shadow type="sensing_keyoptions">
                                <field name="KEY_OPTION">right arrow</field>
                              </shadow>
                            </value>
                          </block>
                        </value>
                        <statement name="SUBSTACK">
                          <block type="motion_changexby">
                            <value name="DX">
                              <shadow type="math_number">
                                <field name="NUM">10</field>
                              </shadow>
                            </value>
                          </block>
                        </statement>
                        <next>
                          <block type="control_if">
                            <value name="CONDITION">
                              <block type="sensing_keypressed">
                                <value name="KEY_OPTION">
                                  <shadow type="sensing_keyoptions">
                                    <field name="KEY_OPTION">up arrow</field>
                                  </shadow>
                                </value>
                              </block>
                            </value>
                            <statement name="SUBSTACK">
                              <block type="motion_changeyby">
                                <value name="DY">
                                  <shadow type="math_number">
                                    <field name="NUM">10</field>
                                  </shadow>
                                </value>
                              </block>
                            </statement>
                            <next>
                              <block type="control_if">
                                <value name="CONDITION">
                                  <block type="sensing_keypressed">
                                    <value name="KEY_OPTION">
                                      <shadow type="sensing_keyoptions">
                                        <field name="KEY_OPTION">down arrow</field>
                                      </shadow>
                                    </value>
                                  </block>
                                </value>
                                <statement name="SUBSTACK">
                                  <block type="motion_changeyby">
                                    <value name="DY">
                                      <shadow type="math_number">
                                        <field name="NUM">-10</field>
                                      </shadow>
                                    </value>
                                  </block>
                                </statement>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </statement>
              </block>
            </next>
          </block>

          请严格按此格式返回积木代码。`
          },

            ...updatedMessages
          ]
        })
      });
      const data = await res.json();
      const assistantReply = data?.choices?.[0]?.message?.content || '无有效返回';
      const isBlock = assistantReply.includes('<block') && assistantReply.includes('type=');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: isBlock
            ? '✅ 已生成图形化积木，请在代码区查看。'
            : assistantReply
        }
      ]);

      if (isBlock) {
        const blockXML = `<xml xmlns="https://developers.google.com/blockly/xml">${assistantReply}</xml>`;
        window.postMessage({ type: 'inject-block', payload: blockXML }, '*'); // ✅ 改为 append-block
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '请求失败，请检查网络或接口。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setPrompt('');
  };

  const handleMouseDown = (e) => {
    dragging.current = true;
    offset.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - offset.current.x;
    const dy = e.clientY - offset.current.y;
    setPosition(prev => ({
      bottom: Math.max(0, prev.bottom - dy),
      right: Math.max(0, prev.right - dx)
    }));
    offset.current = { x: e.clientX, y: e.clientY };
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
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={{ position: 'fixed', bottom: `${position.bottom}px`, right: `${position.right}px`, pointerEvents: 'none', zIndex: 1000 }}>
      <div style={{ pointerEvents: 'auto' }}>
        <div ref={dragRef} onMouseDown={handleMouseDown} style={{ cursor: 'move' }}>
          <button onClick={handleToggle} style={{
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
            cursor: 'pointer'
          }}>
            <BotMessageSquare size={26} />
          </button>
        </div>

        {open && (
          <div style={{
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
          }}>
            <div style={{
              padding: '8px 16px',
              background: 'linear-gradient(to right, #EFF6FF, #DBEAFE)',
              borderBottom: '1px solid #BFDBFE',
              fontWeight: '600',
              fontSize: '14px',
              color: '#1E40AF'
            }}>
              BlockGPT 助手
            </div>

            <div ref={responseRef} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '10px',
              fontSize: '14px',
              color: '#1F2937',
              backgroundColor: '#ffffff'
            }}>
              {messages.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>👋 请输入你想要生成的内容</div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} style={{
                    marginBottom: '10px',
                    backgroundColor: msg.role === 'assistant' ? '#e0f2fe' : 'transparent',
                    padding: '6px 8px',
                    borderRadius: '6px'
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: window.marked?.parse(msg.content || '') || '' }} />
                  </div>
                ))
              )}
            </div>

            <div style={{
              padding: '10px',
              borderTop: '1px solid #BFDBFE',
              backgroundColor: '#ffffff'
            }}>
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
                <button onClick={handleClear} style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}>
                  清空对话
                </button>
                <div>
                  <button onClick={handleToggle} style={{
                    marginRight: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#6B7280',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}>
                    收起
                  </button>
                  <button onClick={handleSend} style={{
                    backgroundColor: '#2563EB',
                    color: '#fff',
                    padding: '4px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer'
                  }}>
                    {loading ? '生成中…' : '发送'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockGPT;
