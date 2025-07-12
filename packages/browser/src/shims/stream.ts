/**
 * Browser shim for Node.js stream module
 */

export class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export class Readable extends EventEmitter {
  readable = true;
  
  read(size?: number): any {
    return null;
  }

  pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
    return destination;
  }

  unpipe(destination?: NodeJS.WritableStream): this {
    return this;
  }

  pause(): this {
    return this;
  }

  resume(): this {
    return this;
  }

  destroy(error?: Error): this {
    this.emit('error', error);
    this.emit('close');
    return this;
  }
}

export class Writable extends EventEmitter {
  writable = true;
  
  write(chunk: any, encoding?: string, callback?: Function): boolean {
    if (callback) callback();
    return true;
  }

  end(chunk?: any, encoding?: string, callback?: Function): this {
    if (typeof chunk === 'function') {
      callback = chunk;
      chunk = undefined;
    } else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    
    if (chunk !== undefined) {
      this.write(chunk, encoding);
    }
    
    if (callback) callback();
    this.emit('finish');
    return this;
  }

  destroy(error?: Error): this {
    this.emit('error', error);
    this.emit('close');
    return this;
  }
}

export class Duplex extends EventEmitter {
  readable = true;
  writable = true;
  
  read(size?: number): any {
    return null;
  }

  write(chunk: any, encoding?: string, callback?: Function): boolean {
    if (callback) callback();
    return true;
  }

  end(chunk?: any, encoding?: string, callback?: Function): this {
    if (typeof chunk === 'function') {
      callback = chunk;
      chunk = undefined;
    } else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    
    if (chunk !== undefined) {
      this.write(chunk, encoding);
    }
    
    if (callback) callback();
    this.emit('finish');
    return this;
  }

  pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
    return destination;
  }

  unpipe(destination?: NodeJS.WritableStream): this {
    return this;
  }

  pause(): this {
    return this;
  }

  resume(): this {
    return this;
  }

  destroy(error?: Error): this {
    this.emit('error', error);
    this.emit('close');
    return this;
  }
}

export class Transform extends Duplex {
  _transform(chunk: any, encoding: string, callback: Function): void {
    callback(null, chunk);
  }
}

export class PassThrough extends Transform {}

export const pipeline = (...streams: any[]) => {
  const callback = streams[streams.length - 1];
  if (typeof callback === 'function') {
    streams.pop();
  }
  
  // Simple pipeline implementation
  for (let i = 0; i < streams.length - 1; i++) {
    streams[i].pipe(streams[i + 1]);
  }
  
  if (callback) {
    streams[streams.length - 1].on('finish', callback);
    streams[0].on('error', callback);
  }
};

export default {
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  pipeline,
};