import React, { useState, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';

const Chat = ({ messages, onSendMessage }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div style={styles.container} className="glass-panel">
      <div style={styles.header}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>Live Chat</h3>
      </div>
      
      <div style={styles.messagesList}>
        {messages.map((msg, index) => (
          <div key={index} style={styles.messageItem}>
            <span style={styles.sender}>{msg.senderName}</span>
            <span style={styles.text}>{msg.message}</span>
            <span style={styles.time}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button type="submit" style={styles.sendBtn}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderLeft: '1px solid var(--glass-border)',
    borderRadius: '0', // Overriding glass-panel radius if used in sidebar
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  messageItem: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '10px',
    borderRadius: '8px'
  },
  sender: {
    fontWeight: '600',
    fontSize: '0.8rem',
    color: 'var(--accent-color)',
    marginBottom: '4px'
  },
  text: {
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  time: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    alignSelf: 'flex-end',
    marginTop: '4px'
  },
  form: {
    display: 'flex',
    padding: '12px',
    borderTop: '1px solid var(--glass-border)',
    gap: '8px',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'white',
    outline: 'none'
  },
  sendBtn: {
    backgroundColor: 'var(--accent-color)',
    color: 'white',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};

export default Chat;
