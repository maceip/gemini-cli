/**
 * Browser shim for Node.js v8 module
 */

export const getHeapStatistics = () => {
  const memory = (performance as any).memory;
  
  return {
    total_heap_size: memory?.totalJSHeapSize || 0,
    total_heap_size_executable: 0,
    total_physical_size: memory?.totalJSHeapSize || 0,
    total_available_size: memory?.jsHeapSizeLimit || 0,
    used_heap_size: memory?.usedJSHeapSize || 0,
    heap_size_limit: memory?.jsHeapSizeLimit || 2147483648,
    malloced_memory: 0,
    peak_malloced_memory: 0,
    does_zap_garbage: false,
    number_of_native_contexts: 0,
    number_of_detached_contexts: 0,
  };
};

export const serialize = (value: any): Buffer => {
  // Simple serialization using JSON for browser
  const json = JSON.stringify(value);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  return Buffer.from(data);
};

export const deserialize = (buffer: Buffer): any => {
  // Simple deserialization using JSON for browser
  const decoder = new TextDecoder();
  const json = decoder.decode(buffer);
  return JSON.parse(json);
};

export default {
  getHeapStatistics,
  serialize,
  deserialize,
};