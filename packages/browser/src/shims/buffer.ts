/**
 * Browser shim for Node.js Buffer
 */

export class Buffer extends Uint8Array {
  static alloc(size: number, fill?: any, encoding?: string): Buffer {
    const buffer = new Buffer(size);
    if (fill !== undefined) {
      buffer.fill(fill);
    }
    return buffer;
  }

  static allocUnsafe(size: number): Buffer {
    return new Buffer(size);
  }

  static from(value: any, encodingOrOffset?: any, length?: number): Buffer {
    if (typeof value === 'string') {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(value);
      return new Buffer(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    }
    
    if (value instanceof ArrayBuffer) {
      return new Buffer(value, encodingOrOffset, length);
    }
    
    if (ArrayBuffer.isView(value)) {
      return new Buffer(value.buffer, value.byteOffset, value.byteLength);
    }
    
    if (Array.isArray(value)) {
      return new Buffer(Uint8Array.from(value).buffer);
    }
    
    throw new TypeError('Invalid argument type for Buffer.from()');
  }

  static concat(list: Buffer[], totalLength?: number): Buffer {
    if (list.length === 0) {
      return Buffer.alloc(0);
    }

    const length = totalLength !== undefined
      ? totalLength
      : list.reduce((acc, buf) => acc + buf.length, 0);

    const result = Buffer.allocUnsafe(length);
    let offset = 0;

    for (const buf of list) {
      result.set(buf, offset);
      offset += buf.length;
      if (offset >= length) break;
    }

    return result;
  }

  static isBuffer(obj: any): obj is Buffer {
    return obj instanceof Buffer;
  }

  static compare(buf1: Buffer, buf2: Buffer): number {
    const len = Math.min(buf1.length, buf2.length);
    
    for (let i = 0; i < len; i++) {
      if (buf1[i] < buf2[i]) return -1;
      if (buf1[i] > buf2[i]) return 1;
    }
    
    if (buf1.length < buf2.length) return -1;
    if (buf1.length > buf2.length) return 1;
    return 0;
  }

  toString(encoding?: string, start?: number, end?: number): string {
    const decoder = new TextDecoder(encoding || 'utf-8');
    const slice = this.subarray(start, end);
    return decoder.decode(slice);
  }

  write(string: string, offset?: number, length?: number, encoding?: string): number {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(string);
    const start = offset || 0;
    const len = length !== undefined ? Math.min(length, encoded.length) : encoded.length;
    
    this.set(encoded.subarray(0, len), start);
    return len;
  }

  toJSON(): { type: 'Buffer'; data: number[] } {
    return {
      type: 'Buffer',
      data: Array.from(this),
    };
  }

  equals(otherBuffer: Buffer): boolean {
    if (this.length !== otherBuffer.length) return false;
    
    for (let i = 0; i < this.length; i++) {
      if (this[i] !== otherBuffer[i]) return false;
    }
    
    return true;
  }

  compare(target: Buffer, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number {
    const sourceSlice = this.subarray(sourceStart, sourceEnd);
    const targetSlice = target.subarray(targetStart, targetEnd);
    
    return Buffer.compare(sourceSlice as Buffer, targetSlice as Buffer);
  }

  copy(target: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number {
    const start = targetStart || 0;
    const slice = this.subarray(sourceStart, sourceEnd);
    target.set(slice, start);
    return slice.length;
  }

  slice(start?: number, end?: number): Buffer {
    return this.subarray(start, end) as Buffer;
  }

  readUInt8(offset: number): number {
    return this[offset];
  }

  readUInt16LE(offset: number): number {
    return this[offset] | (this[offset + 1] << 8);
  }

  readUInt16BE(offset: number): number {
    return (this[offset] << 8) | this[offset + 1];
  }

  readUInt32LE(offset: number): number {
    return (
      this[offset] |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
    ) >>> 0;
  }

  readUInt32BE(offset: number): number {
    return (
      (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3]
    ) >>> 0;
  }

  writeUInt8(value: number, offset: number): number {
    this[offset] = value & 0xff;
    return offset + 1;
  }

  writeUInt16LE(value: number, offset: number): number {
    this[offset] = value & 0xff;
    this[offset + 1] = (value >>> 8) & 0xff;
    return offset + 2;
  }

  writeUInt16BE(value: number, offset: number): number {
    this[offset] = (value >>> 8) & 0xff;
    this[offset + 1] = value & 0xff;
    return offset + 2;
  }

  writeUInt32LE(value: number, offset: number): number {
    this[offset] = value & 0xff;
    this[offset + 1] = (value >>> 8) & 0xff;
    this[offset + 2] = (value >>> 16) & 0xff;
    this[offset + 3] = (value >>> 24) & 0xff;
    return offset + 4;
  }

  writeUInt32BE(value: number, offset: number): number {
    this[offset] = (value >>> 24) & 0xff;
    this[offset + 1] = (value >>> 16) & 0xff;
    this[offset + 2] = (value >>> 8) & 0xff;
    this[offset + 3] = value & 0xff;
    return offset + 4;
  }
}

// Make Buffer available globally
(globalThis as any).Buffer = Buffer;

export default Buffer;