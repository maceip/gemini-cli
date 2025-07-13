/**
 * Browser shim for Node.js events module
 */

export class EventEmitter {
  private events: Map<string | symbol, Set<Function>> = new Map();
  private maxListeners = 10;

  on(event: string | symbol, listener: Function): this {
    return this.addListener(event, listener);
  }

  addListener(event: string | symbol, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
    return this;
  }

  once(event: string | symbol, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  off(event: string | symbol, listener: Function): this {
    return this.removeListener(event, listener);
  }

  removeListener(event: string | symbol, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  removeAllListeners(event?: string | symbol): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('EventEmitter error:', error);
      }
    });
    return true;
  }

  listenerCount(event: string | symbol): number {
    return this.events.get(event)?.size || 0;
  }

  listeners(event: string | symbol): Function[] {
    return Array.from(this.events.get(event) || []);
  }

  eventNames(): (string | symbol)[] {
    return Array.from(this.events.keys());
  }

  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  prependListener(event: string | symbol, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    const listeners = Array.from(this.events.get(event)!);
    this.events.set(event, new Set([listener, ...listeners]));
    return this;
  }

  prependOnceListener(event: string | symbol, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener(...args);
    };
    return this.prependListener(event, onceWrapper);
  }
}

export default EventEmitter;