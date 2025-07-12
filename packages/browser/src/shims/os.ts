/**
 * Browser shim for Node.js os module
 */

export const homedir = () => '/home/user';
export const tmpdir = () => '/tmp';
export const hostname = () => 'browser';
export const platform = () => 'browser';
export const arch = () => 'wasm32';
export const release = () => '1.0.0';
export const type = () => 'Browser';
export const userInfo = () => ({
  username: 'web-user',
  uid: 1000,
  gid: 1000,
  shell: '/bin/sh',
  homedir: '/home/user',
});

export const cpus = () => [
  {
    model: 'Browser CPU',
    speed: 2400,
    times: {
      user: 100000,
      nice: 0,
      sys: 50000,
      idle: 1000000,
      irq: 0,
    },
  },
];

export const totalmem = () => {
  // Try to estimate available memory in browser
  if ('memory' in performance && (performance as any).memory) {
    return (performance as any).memory.jsHeapSizeLimit || 2147483648; // 2GB default
  }
  return 2147483648; // 2GB default
};

export const freemem = () => {
  // Try to estimate free memory in browser
  if ('memory' in performance && (performance as any).memory) {
    const used = (performance as any).memory.usedJSHeapSize || 0;
    const total = (performance as any).memory.jsHeapSizeLimit || 2147483648;
    return total - used;
  }
  return 1073741824; // 1GB default
};

export const uptime = () => performance.now() / 1000;

export const loadavg = () => [0.5, 0.5, 0.5];

export const networkInterfaces = () => ({
  lo: [
    {
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8',
    },
  ],
});

export const EOL = '\n';

export default {
  homedir,
  tmpdir,
  hostname,
  platform,
  arch,
  release,
  type,
  userInfo,
  cpus,
  totalmem,
  freemem,
  uptime,
  loadavg,
  networkInterfaces,
  EOL,
};