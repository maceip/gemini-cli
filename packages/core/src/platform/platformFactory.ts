/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Platform } from './types.js';
import { NodePlatform } from './nodePlatform.js';
import { BrowserPlatform } from './browserPlatform.js';

export class PlatformFactory {
  private static instance: Platform | null = null;

  static create(): Platform {
    if (this.instance) {
      return this.instance;
    }

    // Detect environment
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      // Browser environment
      this.instance = new BrowserPlatform();
    } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js environment
      this.instance = new NodePlatform();
    } else {
      // Default to browser platform in unknown environments
      this.instance = new BrowserPlatform();
    }

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }

  static setPlatform(platform: Platform): void {
    this.instance = platform;
  }
}