import type { NavigationNode, SessionNavSnapshot } from './types';

export const NAV_SESSION_COOKIE = 'palheta_nav_session';

interface CompactNavNode {
  i: string;
  l: string;
  p: string | null;
  ic: string;
  c?: CompactNavNode[];
}

interface CompactSessionPayload {
  u: string;
  n: string;
  e: string;
  sa: 1 | 0;
  cc: 1 | 0;
  ei: string | null;
  en: string | null;
  t: CompactNavNode[];
  ap: string[];
  g: string;
}

// Pure JS/TS SHA-256 + HMAC-SHA256 (works identically in Edge Middleware and Node.js)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(msg: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  const bitLen = msg.length * 8;
  const padLen = (((msg.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(padLen);
  padded.set(msg);
  padded[msg.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((val, idx) => outView.setUint32(idx * 4, val, false));
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hmacSha256Base64Url(data: string, secret: string): string {
  const enc = new TextEncoder();
  let keyBytes: Uint8Array = enc.encode(secret);
  if (keyBytes.length > 64) keyBytes = sha256Bytes(keyBytes);
  const keyBlock = new Uint8Array(64);
  keyBlock.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyBlock[i] ^ 0x5c;
    iKeyPad[i] = keyBlock[i] ^ 0x36;
  }

  const msgBytes = enc.encode(data);
  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(iKeyPad);
  inner.set(msgBytes, 64);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oKeyPad);
  outer.set(innerHash, 64);
  return toBase64Url(sha256Bytes(outer));
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? 'palhetasoft-default-hmac-key-change-in-prod';
}

function toCompactNodes(nodes: NavigationNode[]): CompactNavNode[] {
  return nodes.map((n) => ({
    i: n.id,
    l: n.label,
    p: n.routePath,
    ic: n.iconName,
    ...(n.children.length > 0 ? { c: toCompactNodes(n.children) } : {}),
  }));
}

function fromCompactNodes(nodes: CompactNavNode[]): NavigationNode[] {
  return nodes.map((n, idx) => ({
    id: n.i,
    parentId: null,
    code: n.i,
    label: n.l,
    routePath: n.p,
    iconName: n.ic,
    helpTitle: n.l,
    helpText: '',
    moduleScope: 'core_erp',
    sortOrder: idx,
    children: n.c ? fromCompactNodes(n.c) : [],
  }));
}

export function extractAllowedPaths(tree: NavigationNode[]): string[] {
  const paths = new Set<string>();

  const walk = (nodes: NavigationNode[]) => {
    for (const node of nodes) {
      if (node.routePath) {
        paths.add(node.routePath);
      }
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(tree);
  return Array.from(paths);
}

export function serializeNavigationSession(payload: SessionNavSnapshot): string {
  // Strip verbose helpTitle/helpText prose so cookie stays < 2KB (well under 4096-byte RFC 6265 limit)
  const compact: CompactSessionPayload = {
    u: payload.userId,
    n: payload.fullName,
    e: payload.email,
    sa: payload.isSuperAdmin ? 1 : 0,
    cc: payload.canCancelSales ? 1 : 0,
    ei: payload.activeEstablishmentId,
    en: payload.activeEstablishmentName,
    t: toCompactNodes(payload.tree),
    ap: payload.allowedPaths,
    g: payload.generatedAt,
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(compact));
  const payloadB64 = toBase64Url(jsonBytes);
  const sig = hmacSha256Base64Url(payloadB64, getSessionSecret());
  return `${payloadB64}.${sig}`;
}

export function parseNavigationSession(raw?: string | null): SessionNavSnapshot | null {
  if (!raw) return null;
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx <= 0) return null;

  const payloadB64 = raw.slice(0, dotIdx);
  const providedSig = raw.slice(dotIdx + 1);
  const expectedSig = hmacSha256Base64Url(payloadB64, getSessionSecret());

  // Constant-time string comparison
  if (providedSig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < providedSig.length; i++) {
    diff |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const c = JSON.parse(json) as CompactSessionPayload;
    if (!c || typeof c.u !== 'string' || !Array.isArray(c.t)) {
      return null;
    }
    return {
      userId: c.u,
      fullName: c.n,
      email: c.e,
      isSuperAdmin: c.sa === 1,
      canCancelSales: c.cc === 1,
      activeEstablishmentId: c.ei,
      activeEstablishmentName: c.en,
      tree: fromCompactNodes(c.t),
      allowedPaths: Array.isArray(c.ap) ? c.ap : [],
      generatedAt: c.g,
    };
  } catch {
    return null;
  }
}

export function resolveHomeRoute(snapshot: SessionNavSnapshot): string {
  if (snapshot.allowedPaths.length > 0) return snapshot.allowedPaths[0];
  if (snapshot.isSuperAdmin) return '/admin';
  return '/sem-acesso';
}

export function isRouteAllowed(snapshot: SessionNavSnapshot, pathname: string): boolean {
  if (pathname === '/sem-acesso') return true;
  if (snapshot.isSuperAdmin) return true;
  return snapshot.allowedPaths.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`)
  );
}

export function findModuleHelpByPath(
  tree: NavigationNode[],
  pathname: string
): { label: string; helpTitle: string; helpText: string } | null {
  for (const node of tree) {
    if (node.routePath && (pathname === node.routePath || pathname.startsWith(`${node.routePath}/`))) {
      return {
        label: node.label,
        helpTitle: node.helpTitle,
        helpText: node.helpText,
      };
    }
    if (node.children.length > 0) {
      const found = findModuleHelpByPath(node.children, pathname);
      if (found) return found;
    }
  }
  return null;
}
