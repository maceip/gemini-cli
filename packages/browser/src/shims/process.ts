/**
 * Browser shim for Node.js process global
 */

export const env: Record<string, string> = {
  NODE_ENV: 'production',
  BROWSER: 'true',
};

export const platform = 'browser';
export const version = 'v18.0.0';
export const versions = {
  node: '18.0.0',
  v8: '10.0.0',
  browser: navigator.userAgent,
};

export const argv = ['node', '/index.js'];
export const execPath = '/usr/bin/node';
export const pid = 1;
export const ppid = 0;
export const title = 'browser';
export const arch = 'wasm32';

export const cwd = () => '/';
export const chdir = (dir: string) => {
  console.log(`chdir: ${dir} (no-op in browser)`);
};

export const exit = (code?: number) => {
  console.log(`Process exit with code: ${code || 0}`);
  if (code !== 0) {
    throw new Error(`Process exited with code ${code}`);
  }
};

export const nextTick = (fn: Function, ...args: any[]) => {
  queueMicrotask(() => fn(...args));
};

export const hrtime = {
  bigint: () => BigInt(performance.now() * 1000000),
};

export const on = (event: string, listener: Function) => {
  // Basic event emitter for browser
  window.addEventListener(`process:${event}`, listener as any);
};

export const off = (event: string, listener: Function) => {
  window.removeEventListener(`process:${event}`, listener as any);
};

export const emit = (event: string, ...args: any[]) => {
  window.dispatchEvent(new CustomEvent(`process:${event}`, { detail: args }));
};

export const stdout = {
  write: (data: string) => console.log(data),
  isTTY: true,
};

export const stderr = {
  write: (data: string) => console.error(data),
  isTTY: true,
};

export const stdin = {
  isTTY: true,
  on: () => {},
  pause: () => {},
  resume: () => {},
  setRawMode: () => {},
};

export default {
  env,
  platform,
  version,
  versions,
  argv,
  execPath,
  pid,
  ppid,
  title,
  arch,
  cwd,
  chdir,
  exit,
  nextTick,
  hrtime,
  on,
  off,
  emit,
  stdout,
  stderr,
  stdin,
};