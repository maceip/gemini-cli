/**
 * Browser shim for Node.js string_decoder module
 */

export class StringDecoder {
  private encoding: BufferEncoding;
  private decoder: TextDecoder;
  private lastChar: Uint8Array | null = null;

  constructor(encoding: BufferEncoding = 'utf8') {
    this.encoding = encoding;
    this.decoder = new TextDecoder(this.normalizeEncoding(encoding), { stream: true });
  }

  private normalizeEncoding(encoding: string): string {
    const normalized = encoding.toLowerCase();
    switch (normalized) {
      case 'utf8':
      case 'utf-8':
        return 'utf-8';
      case 'utf16le':
      case 'utf-16le':
        return 'utf-16le';
      case 'latin1':
      case 'binary':
        return 'iso-8859-1';
      case 'base64':
      case 'hex':
        // These require special handling
        return 'utf-8';
      default:
        return 'utf-8';
    }
  }

  write(buffer: Buffer | Uint8Array): string {
    if (this.encoding === 'base64') {
      return this.base64Write(buffer);
    }
    if (this.encoding === 'hex') {
      return this.hexWrite(buffer);
    }

    let input = buffer;
    if (this.lastChar) {
      const combined = new Uint8Array(this.lastChar.length + buffer.length);
      combined.set(this.lastChar);
      combined.set(buffer, this.lastChar.length);
      input = combined;
      this.lastChar = null;
    }

    return this.decoder.decode(input, { stream: true });
  }

  end(buffer?: Buffer | Uint8Array): string {
    let result = '';
    if (buffer && buffer.length > 0) {
      result = this.write(buffer);
    }
    if (this.lastChar) {
      result += this.decoder.decode(this.lastChar, { stream: false });
      this.lastChar = null;
    }
    result += this.decoder.decode(new Uint8Array(0), { stream: false });
    return result;
  }

  private base64Write(buffer: Uint8Array): string {
    const bytes = Array.from(buffer);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  private hexWrite(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

export default { StringDecoder };