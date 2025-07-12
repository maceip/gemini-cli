/**
 * Browser shim for Node.js child_process module
 */

export const exec = (command: string, callback?: any) => {
  const error = new Error('child_process.exec is not supported in the browser');
  if (callback) {
    callback(error, '', '');
  }
  return {
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    on: () => {},
    kill: () => {},
  };
};

export const execSync = () => {
  throw new Error('child_process.execSync is not supported in the browser');
};

export const spawn = () => {
  throw new Error('child_process.spawn is not supported in the browser');
};

export const fork = () => {
  throw new Error('child_process.fork is not supported in the browser');
};

export default {
  exec,
  execSync,
  spawn,
  fork,
};