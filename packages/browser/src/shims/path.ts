/**
 * Browser shim for Node.js path module
 */

import { PlatformFactory } from '@google/gemini-cli-core/src/platform/index.js';

const platform = PlatformFactory.create();
const fileSystem = platform.createFileSystem();

export const sep = '/';
export const delimiter = ':';

export const join = (...paths: string[]): string => {
  return fileSystem.join(...paths);
};

export const resolve = (...paths: string[]): string => {
  return fileSystem.resolve(...paths);
};

export const relative = (from: string, to: string): string => {
  return fileSystem.relative(from, to);
};

export const dirname = (path: string): string => {
  return fileSystem.dirname(path);
};

export const basename = (path: string, ext?: string): string => {
  return fileSystem.basename(path, ext);
};

export const extname = (path: string): string => {
  return fileSystem.extname(path);
};

export const normalize = (path: string): string => {
  return resolve(path);
};

export const isAbsolute = (path: string): boolean => {
  return path.startsWith('/');
};

export const parse = (path: string) => {
  const dir = dirname(path);
  const base = basename(path);
  const ext = extname(path);
  const name = basename(path, ext);
  const root = path.startsWith('/') ? '/' : '';
  
  return { root, dir, base, ext, name };
};

export const format = (pathObject: any) => {
  const { dir, base } = pathObject;
  if (!dir) return base;
  if (dir === '/') return '/' + base;
  return dir + '/' + base;
};

export default {
  sep,
  delimiter,
  join,
  resolve,
  relative,
  dirname,
  basename,
  extname,
  normalize,
  isAbsolute,
  parse,
  format,
};