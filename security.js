// Shared defensive helpers. No account, email, username, password or API key is stored.
export const STORAGE_LIMIT_BYTES = 16 * 1024;
export const P2P_MESSAGE_LIMIT_BYTES = 8 * 1024;
export const INVITE_CODE_LENGTH = 6;
export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const encoder = new TextEncoder();
export const byteLength = value => encoder.encode(String(value)).byteLength;
export function safeJsonParse(text, maxBytes=STORAGE_LIMIT_BYTES) {
  if(typeof text !== 'string' || byteLength(text) > maxBytes) return null;
  try { const value=JSON.parse(text); return value && typeof value==='object' ? value : null; } catch { return null; }
}
export function safeStorageGet(key, maxBytes=STORAGE_LIMIT_BYTES) {
  try { const raw=localStorage.getItem(key); return raw ? safeJsonParse(raw,maxBytes) : null; } catch { return null; }
}
export function safeStorageSet(key, value, maxBytes=STORAGE_LIMIT_BYTES) {
  const raw=JSON.stringify(value);
  if(byteLength(raw)>maxBytes) return false;
  try { localStorage.setItem(key,raw); return true; } catch { return false; }
}
export function randomInviteCode() {
  const bytes=new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>INVITE_ALPHABET[b%INVITE_ALPHABET.length]).join('');
}
export function normalizeInviteCode(value) {
  return String(value??'').toUpperCase().replace(/[^A-Z2-9]/g,'').split('').filter(c=>INVITE_ALPHABET.includes(c)).join('').slice(0,INVITE_CODE_LENGTH);
}
export function randomUint32() { const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]>>>0; }
export function randomPeerId(prefix='academia-peer-') {
  const a=new Uint32Array(4); crypto.getRandomValues(a);
  return prefix+Array.from(a,n=>n.toString(36)).join('-');
}
export function isPlainObject(value) { return value!==null && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype; }
export function exactKeys(obj, allowed) { return isPlainObject(obj) && Object.keys(obj).every(k=>allowed.includes(k)); }
export function safeInt(v,min,max) { return Number.isSafeInteger(v) && v>=min && v<=max; }
export function validId(v, allowedSet, max=64) { return typeof v==='string' && v.length>0 && v.length<=max && allowedSet.has(v); }
export function boundedString(v,max=64) { return typeof v==='string' && v.length>0 && v.length<=max; }
