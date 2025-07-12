import { PlatformFactory } from '@gemini-cli/core/src/platform/index.js';
import { OPFSFileSystem } from '@gemini-cli/core/src/fs/opfsFileSystem.js';

export async function initializePlatform(): Promise<void> {
  // Check for required browser features
  if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
    throw new Error(
      'Your browser does not support the Origin Private File System API. ' +
      'Please use a modern browser like Chrome 86+, Edge 86+, or Safari 15.2+.'
    );
  }

  // Initialize the file system
  const platform = PlatformFactory.create();
  const fileSystem = platform.createFileSystem();
  
  if (fileSystem instanceof OPFSFileSystem) {
    await fileSystem.initialize();
  }

  // Check for other required features
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is required but not available.');
  }

  if (typeof TextEncoder === 'undefined' || typeof TextDecoder === 'undefined') {
    throw new Error('TextEncoder/TextDecoder APIs are required but not available.');
  }

  console.log('Platform initialized successfully');
}