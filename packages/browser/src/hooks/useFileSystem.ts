import { useState, useEffect, useCallback } from 'react';
import { getFileSystem } from '@google/gemini-cli-core/src/utils/fileUtilsAbstract.js';
import { FileSystem } from '@google/gemini-cli-core/src/fs/types.js';

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

export function useFileSystem() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fs, setFs] = useState<FileSystem | null>(null);

  useEffect(() => {
    const initFS = async () => {
      try {
        const fileSystem = getFileSystem();
        setFs(fileSystem);
        setInitialized(true);
        
        // Load initial directory
        await loadDirectory('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize file system');
      }
    };

    initFS();
  }, []);

  const loadDirectory = useCallback(async (path: string) => {
    if (!fs) return;

    try {
      const entries = await fs.readdir(path);
      const fileEntries: FileEntry[] = [];

      for (const entry of entries) {
        const entryPath = fs.join(path, entry);
        try {
          const stat = await fs.stat(entryPath);
          fileEntries.push({
            name: entry,
            isDirectory: stat.isDirectory,
            size: stat.size,
            modified: stat.mtime,
          });
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort: directories first, then alphabetically
      fileEntries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setFiles(fileEntries);
      setCurrentPath(path);
    } catch (err) {
      console.error('Failed to load directory:', err);
    }
  }, [fs]);

  const navigateTo = useCallback(async (pathOrName: string) => {
    if (!fs) return;

    let newPath: string;
    if (pathOrName === '..') {
      newPath = fs.dirname(currentPath);
    } else if (pathOrName.startsWith('/')) {
      newPath = pathOrName;
    } else {
      newPath = fs.join(currentPath, pathOrName);
    }

    await loadDirectory(newPath);
  }, [fs, currentPath, loadDirectory]);

  const createFile = useCallback(async (name: string, content: string = '') => {
    if (!fs) return;

    const filePath = fs.join(currentPath, name);
    await fs.writeFile(filePath, content);
    await loadDirectory(currentPath);
  }, [fs, currentPath, loadDirectory]);

  const createDirectory = useCallback(async (name: string) => {
    if (!fs) return;

    const dirPath = fs.join(currentPath, name);
    await fs.mkdir(dirPath);
    await loadDirectory(currentPath);
  }, [fs, currentPath, loadDirectory]);

  const deleteItem = useCallback(async (name: string) => {
    if (!fs) return;

    const itemPath = fs.join(currentPath, name);
    const stat = await fs.stat(itemPath);
    
    if (stat.isDirectory) {
      await fs.rmdir(itemPath, { recursive: true });
    } else {
      await fs.unlink(itemPath);
    }
    
    await loadDirectory(currentPath);
  }, [fs, currentPath, loadDirectory]);

  const readFile = useCallback(async (path: string): Promise<string> => {
    if (!fs) throw new Error('File system not initialized');
    return fs.readFile(path);
  }, [fs]);

  const writeFile = useCallback(async (path: string, content: string) => {
    if (!fs) throw new Error('File system not initialized');
    await fs.writeFile(path, content);
    await loadDirectory(currentPath);
  }, [fs, currentPath, loadDirectory]);

  return {
    initialized,
    error,
    currentPath,
    files,
    navigateTo,
    createFile,
    createDirectory,
    deleteItem,
    readFile,
    writeFile,
  };
}