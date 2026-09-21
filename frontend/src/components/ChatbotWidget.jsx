import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './ChatbotWidget.css'; // We'll create this CSS next

const ChatbotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi there! I am your Amaze AI Assistant. Ask me anything about the products you track!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await api.post('/chat', { message: userMessage });
      
      if (response.data && response.data.reply) {
        setMessages(prev => [...prev, { role: 'ai', content: response.data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an unexpected response.' }]);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // api.js interceptor will handle the logout, we just need to notify the user
        setMessages(prev => [...prev, { role: 'ai', content: 'Your session has expired. Please log in again.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Network error or server issue. Please try again later.' }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return null; // Don't show chatbot for guests

  return (
    <div className="chatbot-wrapper">
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <div className="header-info">
            <span className="ai-icon">✨</span>
            <h4>Amaze AI Assistant</h4>
          </div>
          <button className="close-btn" onClick={toggleChat}>&times;</button>
        </div>
        
        <div className="chatbot-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.role}`}>
              {msg.role === 'ai' && <span className="bubble-icon">✨</span>}
              <p>{msg.content}</p>
            </div>
          ))}
          {isTyping && (
            <div className="message-bubble ai typing">
              <span className="bubble-icon">✨</span>
              <p>Thinking<span className="dots">...</span></p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatbot-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Ask about your products..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={isTyping || !input.trim()}>
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M48 448l416-192L48 64v149.333L346 256 48 298.667z"></path>
            </svg>
          </button>
        </form>
      </div>

      <button className={`chatbot-toggle ${isOpen ? 'hide' : ''}`} onClick={toggleChat}>
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
          <path fill="none" d="M0 0h24v24H0V0z"></path>
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm8 0h2v2h-2zm-4 0h2v2h-2z"></path>
        </svg>
      </button>
    </div>
  );
};

export default ChatbotWidget;
