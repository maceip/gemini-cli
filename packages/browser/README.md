# Gemini CLI - Browser Edition

This is the browser-based version of Gemini CLI, allowing you to run the AI assistant entirely in your web browser using modern web APIs.

## Features

- 🌐 **Runs entirely in the browser** - No server required
- 📁 **Origin Private File System (OPFS)** - Persistent file storage
- 🖥️ **Terminal emulation** - Full terminal experience with xterm.js
- 🎨 **Theme support** - Dark and light themes
- 📝 **Markdown rendering** - Rich text responses with syntax highlighting
- 🔧 **File management** - Create, read, and manage files in browser storage

## Requirements

- Modern browser with support for:
  - Origin Private File System API (Chrome 86+, Edge 86+, Safari 15.2+)
  - Web Crypto API
  - ES2020+ features

## Getting Started

### Development

1. Install dependencies:
```bash
cd packages/browser
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Architecture

### File System Abstraction

The browser version uses an abstraction layer that allows the same code to work in both Node.js and browser environments:

- **Node.js**: Uses native `fs` module
- **Browser**: Uses Origin Private File System (OPFS) API

### Platform Detection

The platform is automatically detected using the `PlatformFactory`:

```typescript
const platform = PlatformFactory.create();
const fileSystem = platform.createFileSystem();
```

### Tools Adaptation

All file operation tools have been adapted to work with the abstraction:

- `ReadFileTool` → `ReadFileToolAbstract`
- `WriteFileTool` → `WriteFileToolAbstract`
- `GlobTool` → `GlobToolAbstract`
- `GrepTool` → `GrepToolAbstract`
- `LSFileTool` → `LSToolAbstract`

## Limitations

Due to browser security restrictions, some features are limited or unavailable:

1. **Shell Commands**: Limited to a basic subset (echo, pwd, cd, env)
2. **Git Operations**: Not available (consider using isomorphic-git in future)
3. **Child Processes**: Cannot spawn external processes
4. **File System Access**: Limited to OPFS sandbox
5. **Network Access**: Subject to CORS restrictions

## Configuration

Configuration is stored in browser localStorage:

```javascript
{
  "apiKey": "your-api-key",
  "model": "gemini-pro",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

## Security Considerations

- All data is stored locally in the browser
- OPFS provides sandboxed file storage
- API keys are stored in localStorage (consider encryption)
- No server communication except for Gemini API calls

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 86+ | Full support |
| Edge | 86+ | Full support |
| Safari | 15.2+ | Full support |
| Firefox | 111+ | Requires flag enablement |

## Development Tips

### Testing File Operations

```javascript
// Get file system instance
const fs = getFileSystem();

// Write a file
await fs.writeFile('/test.txt', 'Hello, World!');

// Read a file
const content = await fs.readFile('/test.txt');

// List directory
const files = await fs.readdir('/');
```

### Adding New Tools

1. Create tool implementation using the abstraction
2. Ensure it works with both `NodeFileSystem` and `OPFSFileSystem`
3. Test thoroughly in both environments

## Future Enhancements

- [ ] WebAssembly for better performance
- [ ] Service Worker for offline support
- [ ] PWA capabilities
- [ ] Collaborative features using WebRTC
- [ ] Cloud sync options
- [ ] More shell command implementations

## Troubleshooting

### "Browser does not support OPFS"

Ensure you're using a supported browser version. Check browser compatibility table above.

### "File operations failing"

Check browser console for detailed errors. Ensure you've granted necessary permissions.

### "API key not working"

Make sure the API key is correctly set in settings and has appropriate permissions.

## Contributing

See the main project README for contribution guidelines. When working on browser-specific features:

1. Test in multiple browsers
2. Ensure graceful degradation for unsupported features
3. Update browser compatibility documentation
4. Add appropriate error handling