import React, { useState } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onClose: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { files, currentPath, navigateTo, createFile, createDirectory } = useFileSystem();
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<'file' | 'directory'>('file');
  const [newItemName, setNewItemName] = useState('');

  const handleCreateNew = async () => {
    if (!newItemName.trim()) return;

    try {
      if (newItemType === 'file') {
        await createFile(newItemName);
      } else {
        await createDirectory(newItemName);
      }
      setShowNewItemDialog(false);
      setNewItemName('');
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Files</h2>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      <div className={styles.toolbar}>
        <button
          className={styles.toolbarButton}
          onClick={() => {
            setNewItemType('file');
            setShowNewItemDialog(true);
          }}
          title="New file"
        >
          📄
        </button>
        <button
          className={styles.toolbarButton}
          onClick={() => {
            setNewItemType('directory');
            setShowNewItemDialog(true);
          }}
          title="New folder"
        >
          📁
        </button>
      </div>

      <div className={styles.pathBar}>
        <span className={styles.currentPath}>{currentPath}</span>
      </div>

      <div className={styles.fileList}>
        {currentPath !== '/' && (
          <div 
            className={styles.fileItem}
            onClick={() => navigateTo('..')}
          >
            <span className={styles.fileIcon}>📁</span>
            <span className={styles.fileName}>..</span>
          </div>
        )}
        
        {files.map((file) => (
          <div
            key={file.name}
            className={styles.fileItem}
            onClick={() => file.isDirectory && navigateTo(file.name)}
          >
            <span className={styles.fileIcon}>
              {file.isDirectory ? '📁' : '📄'}
            </span>
            <span className={styles.fileName}>{file.name}</span>
          </div>
        ))}
      </div>

      {showNewItemDialog && (
        <div className={styles.dialog}>
          <div className={styles.dialogContent}>
            <h3>Create new {newItemType}</h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Enter ${newItemType} name`}
              className={styles.input}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNew();
                if (e.key === 'Escape') {
                  setShowNewItemDialog(false);
                  setNewItemName('');
                }
              }}
            />
            <div className={styles.dialogButtons}>
              <button 
                className={styles.button}
                onClick={handleCreateNew}
              >
                Create
              </button>
              <button 
                className={styles.button}
                onClick={() => {
                  setShowNewItemDialog(false);
                  setNewItemName('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}