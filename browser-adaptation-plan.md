# Browser Adaptation Plan for Gemini CLI

## Overview
This document outlines the technical plan for adapting the Gemini CLI project to run entirely within a web browser using Origin Private File System (OPFS) and browser-compatible alternatives to system tools.

## Architecture Changes

### 1. File System Abstraction Layer

#### Current State
- Direct Node.js `fs` module usage in tools
- File paths use OS-specific path resolution
- Synchronous and asynchronous file operations

#### Proposed Changes
```typescript
// Create abstract file system interface
interface FileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readdir(path: string): Promise<string[]>
  stat(path: string): Promise<FileStat>
  glob(pattern: string): Promise<string[]>
  grep(pattern: string, path: string): Promise<GrepResult[]>
}

// Implementations
class NodeFileSystem implements FileSystem { /* existing code */ }
class OPFSFileSystem implements FileSystem { /* browser implementation */ }
class VirtualFileSystem implements FileSystem { /* fallback for older browsers */ }
```

#### OPFS Implementation Details
- Use File System Access API where available
- Fall back to IndexedDB for browsers without OPFS support
- Implement virtual directory structure with metadata storage
- Cache frequently accessed files in memory

### 2. Tool Adaptations

#### File Operation Tools
| Tool | Current Implementation | Browser Implementation |
|------|----------------------|----------------------|
| ReadFileTool | Node.js `fs.readFile` | OPFS/IndexedDB read |
| WriteFileTool | Node.js `fs.writeFile` | OPFS/IndexedDB write |
| GlobTool | `glob` package | Custom pattern matching on virtual FS |
| GrepTool | `ripgrep` binary | JavaScript regex search |
| LSFileTool | Node.js `fs.readdir` | Virtual directory listing |

#### Shell/Bash Tool
- **Option 1**: Remove shell functionality entirely
- **Option 2**: Implement limited command subset:
  - `cd`, `pwd`, `ls`, `cat`, `echo`, `mkdir`, `rm`
  - Use Web Workers for isolated execution
  - Maintain shell state in browser memory
- **Option 3**: Integrate WebAssembly-based terminal (e.g., xterm.js + WASM shell)

#### Git Operations
- **Option 1**: Use isomorphic-git library
  - Supports basic git operations in browser
  - Works with virtual file system
  - Limited compared to native git
- **Option 2**: Proxy to server-side git API
  - Better compatibility but requires backend
- **Option 3**: Remove git functionality

### 3. Platform Abstraction

```typescript
// Platform detection and capability checking
interface Platform {
  type: 'node' | 'browser'
  capabilities: {
    fileSystem: boolean
    shell: boolean
    git: boolean
    clipboard: boolean
  }
  createFileSystem(): FileSystem
  createShell(): Shell | null
}

// Factory pattern for platform-specific implementations
class PlatformFactory {
  static create(): Platform {
    if (typeof window !== 'undefined') {
      return new BrowserPlatform()
    }
    return new NodePlatform()
  }
}
```

### 4. UI Layer Changes

#### From Ink to React Web
- Replace Ink components with React web components
- Maintain similar component structure for easy migration
- Key component mappings:
  - `<Box>` → `<div>` with flexbox
  - `<Text>` → `<span>` or `<p>`
  - Terminal colors → CSS classes
  - Spinner → CSS animations

#### Terminal Emulation
- Use xterm.js for terminal-like UI
- Implement custom renderer for AI responses
- Support markdown rendering in terminal
- Maintain keyboard shortcuts and interactions

### 5. Build System Changes

#### Webpack/Vite Configuration
```javascript
// vite.config.js
export default {
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/browser/index.ts',
      formats: ['es']
    }
  },
  resolve: {
    alias: {
      'fs': './src/browser/shims/fs.ts',
      'path': './src/browser/shims/path.ts',
      'child_process': './src/browser/shims/child_process.ts'
    }
  }
}
```

#### Polyfills and Shims
- Path operations (join, resolve, basename, etc.)
- Process globals (env, cwd, exit)
- Buffer operations
- Stream interfaces

### 6. Security Considerations

#### Sandboxing
- Use Content Security Policy (CSP)
- Isolate user code execution in Web Workers
- Sanitize file paths to prevent directory traversal
- Implement quota management for storage

#### Permissions
- Request file system permissions progressively
- Implement permission UI for sensitive operations
- Store permissions in browser storage

### 7. Progressive Web App Features

#### Offline Support
- Service Worker for caching
- Offline-first architecture
- Sync changes when online

#### Installation
- Web App Manifest
- Install prompts
- Desktop PWA integration

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 weeks)
1. Create file system abstraction interface
2. Implement OPFS file system backend
3. Create platform detection and factory
4. Set up build system for browser target

### Phase 2: Tool Migration (3-4 weeks)
1. Migrate file operation tools (read, write, ls)
2. Implement glob and grep in JavaScript
3. Create shell command parser and executor
4. Adapt or remove git functionality

### Phase 3: UI Migration (2-3 weeks)
1. Convert Ink components to React web
2. Implement terminal emulator integration
3. Adapt keyboard shortcuts and interactions
4. Create responsive layout

### Phase 4: Integration & Testing (2 weeks)
1. Integration testing of all components
2. Performance optimization
3. Cross-browser compatibility testing
4. Security audit

### Phase 5: PWA Features (1-2 weeks)
1. Service Worker implementation
2. Offline support
3. Installation flow
4. Desktop integration

## Technical Challenges & Solutions

### Challenge 1: File System Performance
**Solution**: 
- Implement intelligent caching layer
- Use Web Workers for file operations
- Batch operations where possible
- Virtual file system with lazy loading

### Challenge 2: Limited Browser APIs
**Solution**:
- Feature detection with graceful degradation
- Provide clear capability indicators to users
- Optional server-side proxy for advanced features

### Challenge 3: Memory Constraints
**Solution**:
- Implement file content streaming
- Use virtual scrolling for large outputs
- Garbage collection for unused file handles
- Storage quota management

### Challenge 4: Shell Command Compatibility
**Solution**:
- Curated subset of supported commands
- Clear documentation of limitations
- Command aliasing for common operations
- Plugin system for extending commands

## Dependencies & Libraries

### Required Libraries
- **File System**: `@opfs/shim` or native File System Access API
- **Terminal**: `xterm.js` for terminal emulation
- **Git**: `isomorphic-git` (optional)
- **Storage**: `idb` for IndexedDB wrapper
- **Build**: `vite` with appropriate plugins

### Removed Dependencies
- All Node.js specific modules (`fs`, `path`, `child_process`)
- Native binaries (ripgrep, etc.)
- Node-specific authentication libraries

## Migration Strategy

### For Existing Users
1. Export/import functionality for settings
2. Cloud sync option for file data
3. Migration guide documentation
4. Feature parity roadmap

### Deployment Options
1. **Static hosting**: GitHub Pages, Netlify, Vercel
2. **Self-hosted**: Docker container with nginx
3. **Hybrid**: Browser UI with optional backend services

## Success Metrics
- File operation performance within 2x of native
- Support for 95% of common use cases
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- PWA score of 90+ in Lighthouse
- User satisfaction maintained or improved

## Future Enhancements
- WebContainer API integration for full Node.js compatibility
- Collaborative features using WebRTC
- Cloud storage backend options
- Extension marketplace for custom tools