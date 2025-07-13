# Browser Adaptation Plan for Gemini CLI Tools

## Executive Summary

This document outlines the comprehensive plan to adapt all Gemini CLI tools for browser environments. The adaptation involves replacing Node.js-specific APIs with browser-compatible alternatives while maintaining the same functionality and API contracts.

## Tool Analysis and Adaptation Strategy

### 1. File System Tools

**Alternative Strategy Note:** If the OPFS approach (e.g., `git clone opfs://`) proves challenging or has limitations, we could pivot to a GitHub API-based strategy where:
- All file operations work directly with GitHub repositories
- Files are read/written via GitHub's REST or GraphQL API
- Changes are committed directly to GitHub
- This would provide version control out of the box and eliminate local file system needs
- Trade-offs: Requires GitHub authentication, network dependency, API rate limits

#### 1.1 ReadFileTool (`read-file.ts`)
**Current Dependencies:**
- Node.js: `fs`, `path` modules
- File system access for reading files

**Browser Adaptation:**
- **Primary Solution:** File System Access API (Chrome/Edge)
- **Fallback 1:** Origin Private File System (OPFS) for virtual file system
- **Fallback 2:** GitHub API for direct repository file access
- **Implementation:**
  ```typescript
  // Browser implementation using File System Access API
  async function readFile(handle: FileSystemFileHandle): Promise<string> {
    const file = await handle.getFile();
    return await file.text();
  }
  
  // Alternative GitHub API implementation
  async function readFileFromGitHub(owner: string, repo: string, path: string): Promise<string> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    const data = await response.json();
    return atob(data.content); // Decode base64 content
  }
  ```

#### 1.2 WriteFileTool (`write-file.ts`)
**Current Dependencies:**
- Node.js: `fs`, `path` modules
- Direct file system write access

**Browser Adaptation:**
- **Primary Solution:** File System Access API with user permission
- **Fallback:** OPFS for sandboxed writes
- **Implementation Notes:**
  - Requires user gesture for initial access
  - Must handle permission prompts gracefully
  - Diff generation can use existing Diff library

#### 1.3 EditTool (`edit.ts`)
**Current Dependencies:**
- Node.js: `fs`, `path` modules
- File read/write for in-place editing

**Browser Adaptation:**
- **Solution:** Combine File System Access API read + write
- **Challenge:** Atomic operations not guaranteed
- **Implementation Strategy:**
  - Read file content
  - Apply edits in memory
  - Write back with user permission

#### 1.4 LSTool (`ls.ts`)
**Current Dependencies:**
- Node.js: `fs.readdirSync`, `fs.statSync`
- Directory traversal

**Browser Adaptation:**
- **Primary Solution:** File System Access API directory iteration
- **Implementation:**
  ```typescript
  async function* listDirectory(dirHandle: FileSystemDirectoryHandle) {
    for await (const entry of dirHandle.values()) {
      yield {
        name: entry.name,
        kind: entry.kind,
        handle: entry
      };
    }
  }
  ```

#### 1.5 GlobTool (`glob.ts`)
**Current Dependencies:**
- Node.js: `fs`, `path`, `glob` package
- File system traversal with pattern matching

**Browser Adaptation:**
- **Solution:** Recursive directory traversal with minimatch
- **Implementation Requirements:**
  - Port glob pattern matching to browser
  - Use minimatch or similar browser-compatible library
  - Implement recursive directory walking

#### 1.6 GrepTool (`grep.ts`)
**Current Dependencies:**
- Node.js: `fs`, `child_process` (for git grep)
- System grep commands

**Browser Adaptation:**
- **Solution:** Pure JavaScript implementation
- **Implementation:**
  - Use Web Workers for performance
  - Implement regex matching in JavaScript
  - Remove git grep and system grep strategies

#### 1.7 ReadManyFilesTool (`read-many-files.ts`)
**Current Dependencies:**
- Node.js: `fs`, `path`, `glob`
- Batch file operations

**Browser Adaptation:**
- **Solution:** Iterate with File System Access API
- **Performance Considerations:**
  - Use concurrent file reads where possible
  - Implement progress reporting for large operations

### 2. Shell Execution Tool

#### 2.1 ShellTool (`shell.ts`)
**Current Dependencies:**
- Node.js: `child_process.spawn`
- System command execution
- Process management

**Browser Adaptation Options:**
1. **WebAssembly Terminal:**
   - Integrate xterm.js or similar
   - Use WASM builds of common tools (bash, coreutils)
   - Limited to WASM-compiled commands

2. **Browser Extension API:**
   - Native messaging for system commands
   - Requires extension installation
   - Security implications

3. **Restricted Command Set:**
   - Implement JavaScript versions of common commands
   - Support only safe, sandboxed operations
   - Examples: ls, cat, echo, pwd (virtual)

**Recommended Approach:** Combination of WASM terminal for basic commands and JavaScript implementations for common operations.

### 3. Web Tools

#### 3.1 WebFetchTool (`web-fetch.ts`)
**Current Dependencies:**
- Network requests
- HTML to text conversion

**Browser Adaptation:**
- **CORS Challenge:** Browser security restrictions
- **Solutions:**
  1. CORS proxy server
  2. Browser extension with enhanced permissions
  3. Server-side API endpoint
- **Implementation:** Use native `fetch()` API with proxy

#### 3.2 WebSearchTool (`web-search.ts`)
**Current Dependencies:**
- Gemini API for search
- Network requests

**Browser Adaptation:**
- **Solution:** Direct API calls from browser
- **Requirements:**
  - API key management in browser
  - Secure storage considerations

### 4. Memory Tool

#### 4.1 MemoryTool (`memoryTool.ts`)
**Current Dependencies:**
- Node.js: `fs` for file persistence
- Home directory access

**Browser Adaptation:**
- **Primary Solution:** IndexedDB for structured storage
- **Fallback:** localStorage for simple key-value
- **Implementation:**
  ```typescript
  class BrowserMemoryStorage {
    private db: IDBDatabase;
    
    async saveMemory(fact: string): Promise<void> {
      const tx = this.db.transaction(['memories'], 'readwrite');
      await tx.objectStore('memories').add({
        fact,
        timestamp: Date.now()
      });
    }
  }
  ```

### 5. MCP Tool

#### 5.1 MCPTool (`mcp-tool.ts`, `mcp-client.ts`)
**Current Dependencies:**
- Inter-process communication
- External server connections

**Browser Adaptation:**
- **Solution:** WebSocket or MessagePort API
- **Architecture Changes:**
  - MCP servers must expose WebSocket endpoints
  - Or use SharedWorker for in-browser MCP servers
- **Security:** Implement proper origin checks

## Implementation Architecture

### Abstract Base Classes

Create platform-agnostic interfaces:

```typescript
// Abstract file system interface
interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<FileEntry[]>;
  glob(pattern: string): Promise<string[]>;
}

// Node.js implementation
class NodeFileSystemAdapter implements FileSystemAdapter {
  // Existing Node.js implementations
}

// Browser implementation
class BrowserFileSystemAdapter implements FileSystemAdapter {
  // Browser-specific implementations
}
```

### Platform Detection and Loading

```typescript
export async function createFileSystemAdapter(): Promise<FileSystemAdapter> {
  if (typeof window !== 'undefined') {
    const { BrowserFileSystemAdapter } = await import('./browser/fs-adapter');
    return new BrowserFileSystemAdapter();
  } else {
    const { NodeFileSystemAdapter } = await import('./node/fs-adapter');
    return new NodeFileSystemAdapter();
  }
}
```

## Security Considerations

1. **File System Access:**
   - Always require user permission
   - Implement permission caching
   - Clear permission indicators

2. **Network Requests:**
   - Validate URLs before fetching
   - Implement request throttling
   - Use Content Security Policy

3. **Code Execution:**
   - Sandbox all executed code
   - No eval() or Function() constructor
   - Use Web Workers for isolation

4. **Data Storage:**
   - Encrypt sensitive data in IndexedDB
   - Implement data expiration
   - Clear storage option for users

## Progressive Enhancement Strategy

1. **Feature Detection:**
   ```typescript
   const features = {
     fileSystemAccess: 'showOpenFilePicker' in window,
     opfs: 'storage' in navigator && 'getDirectory' in navigator.storage,
     indexedDB: 'indexedDB' in window
   };
   ```

2. **Graceful Degradation:**
   - Provide clear messages for unsupported features
   - Offer alternative workflows
   - Guide users to supported browsers

## Testing Strategy

1. **Unit Tests:**
   - Mock browser APIs
   - Test both implementations
   - Ensure API compatibility

2. **Integration Tests:**
   - Use Playwright for browser testing
   - Test actual file operations
   - Verify permission flows

3. **Cross-Browser Testing:**
   - Chrome/Edge (full feature set)
   - Firefox (limited file system)
   - Safari (basic features only)

## Performance Optimizations

1. **Web Workers:**
   - Offload grep/search operations
   - Parallel file processing
   - Background indexing

2. **Caching:**
   - Cache file handles
   - Memoize directory listings
   - Store computed results

3. **Lazy Loading:**
   - Load tools on demand
   - Split bundles by feature
   - Progressive enhancement

## Migration Path

### Phase 1: Core Infrastructure (2 weeks)
- [ ] Create abstract interfaces
- [ ] Implement platform detection
- [ ] Set up build system for dual targets

### Phase 2: File System Tools (3 weeks)
- [ ] Implement BrowserFileSystemAdapter
- [ ] Port read/write tools
- [ ] Port directory operations

### Phase 3: Advanced Tools (3 weeks)
- [ ] Port grep with Web Workers
- [ ] Implement browser shell
- [ ] Adapt memory storage

### Phase 4: Integration & Testing (2 weeks)
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Documentation

### Phase 5: Polish & Release (1 week)
- [ ] UI/UX improvements
- [ ] Error handling
- [ ] Release preparation

## Estimated Timeline: 11 weeks

## Open Questions

1. **Shell Tool Strategy:**
   - Full WASM terminal vs limited command set?
   - Browser extension vs pure web?

2. **File System Persistence:**
   - OPFS vs File System Access API priority?
   - Sync strategies between browser and local?

3. **MCP Architecture:**
   - WebSocket vs MessagePort?
   - Security model for browser MCP?

## Conclusion

Browser adaptation of Gemini CLI tools is feasible with modern browser APIs. The key challenges are:
- File system access limitations
- Shell command execution
- Network security (CORS)

The proposed architecture maintains API compatibility while providing platform-specific implementations. Progressive enhancement ensures basic functionality across all browsers while leveraging advanced features where available.