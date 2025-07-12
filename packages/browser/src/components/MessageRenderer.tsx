import React from 'react';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import styles from './MessageRenderer.module.css';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // Use external default escaping
  }
});

interface MessageRendererProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
}

export function MessageRenderer({ message }: MessageRendererProps) {
  if (message.role === 'user') {
    return (
      <div className={styles.userMessage}>
        <div className={styles.messageHeader}>You</div>
        <div className={styles.messageContent}>{message.content}</div>
      </div>
    );
  }

  const rendered = md.render(message.content);

  return (
    <div className={styles.assistantMessage}>
      <div className={styles.messageHeader}>Assistant</div>
      <div 
        className={styles.messageContent}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  );
}