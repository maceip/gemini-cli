/**
 * Browser shim for Node.js url module
 */

export class URL extends globalThis.URL {}
export class URLSearchParams extends globalThis.URLSearchParams {}

export function parse(urlString: string) {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      slashes: url.protocol.includes('//'),
      auth: url.username ? `${url.username}:${url.password}` : null,
      host: url.host,
      port: url.port || null,
      hostname: url.hostname,
      hash: url.hash,
      search: url.search,
      query: url.search.slice(1),
      pathname: url.pathname,
      path: url.pathname + url.search,
      href: url.href,
    };
  } catch {
    return null;
  }
}

export function format(urlObject: any) {
  if (typeof urlObject === 'string') {
    return urlObject;
  }
  const url = new URL('http://example.com');
  if (urlObject.protocol) url.protocol = urlObject.protocol;
  if (urlObject.hostname) url.hostname = urlObject.hostname;
  if (urlObject.port) url.port = urlObject.port;
  if (urlObject.pathname) url.pathname = urlObject.pathname;
  if (urlObject.search) url.search = urlObject.search;
  if (urlObject.hash) url.hash = urlObject.hash;
  return url.toString();
}

export function resolve(from: string, to: string) {
  return new URL(to, from).toString();
}

export const pathToFileURL = (path: string) => {
  return new URL(`file://${path}`);
};

export const fileURLToPath = (url: string | URL) => {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  if (urlObj.protocol !== 'file:') {
    throw new Error('Not a file URL');
  }
  return urlObj.pathname;
};

export default {
  URL,
  URLSearchParams,
  parse,
  format,
  resolve,
  pathToFileURL,
  fileURLToPath,
};