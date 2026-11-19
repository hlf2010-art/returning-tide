// Small gaps in older Safari (14-15.3, macOS Big Sur / Monterey): filled before anything else runs.
// Imported first in main.js, so it is evaluated before any other module.
function at(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; }
const typed = Object.getPrototypeOf(Int8Array.prototype);
for (const P of [Array.prototype, String.prototype, typed]) if (!P.at) Object.defineProperty(P, 'at', { value: at, writable: true, configurable: true });
if (!Object.hasOwn) Object.hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
if (!globalThis.structuredClone) globalThis.structuredClone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
if (!Array.prototype.findLast) Object.defineProperty(Array.prototype, 'findLast', { value(f, t) { for (let i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return this[i]; return undefined; }, writable: true, configurable: true });
