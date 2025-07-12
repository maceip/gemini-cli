/**
 * Browser shim for Node.js fs module
 */

import { PlatformFactory } from '@gemini-cli/core/src/platform/index.js';

const platform = PlatformFactory.create();
const fileSystem = platform.createFileSystem();

export const promises = {
  readFile: (path: string, encoding?: string) => fileSystem.readFile(path, encoding as BufferEncoding),
  writeFile: (path: string, data: string | Buffer, encoding?: string) => fileSystem.writeFile(path, data, encoding as BufferEncoding),
  readdir: (path: string) => fileSystem.readdir(path),
  mkdir: (path: string, options?: any) => fileSystem.mkdir(path, options),
  rmdir: (path: string, options?: any) => fileSystem.rmdir(path, options),
  unlink: (path: string) => fileSystem.unlink(path),
  rename: (oldPath: string, newPath: string) => fileSystem.rename(oldPath, newPath),
  copyFile: (src: string, dest: string) => fileSystem.copyFile(src, dest),
  stat: (path: string) => fileSystem.stat(path),
  access: async (path: string) => {
    const exists = await fileSystem.exists(path);
    if (!exists) throw new Error(`ENOENT: no such file or directory, access '${path}'`);
  },
  rm: (path: string, options?: any) => fileSystem.rmdir(path, options),
};

// Sync versions throw errors since browser is async-only
export const readFileSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const writeFileSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const readdirSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const existsSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const mkdirSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const unlinkSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const statSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const openSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const closeSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const readSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export const fstatSync = () => {
  throw new Error('Synchronous file operations are not supported in the browser');
};

export default {
  promises,
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  statSync,
  openSync,
  closeSync,
  readSync,
  fstatSync,
};