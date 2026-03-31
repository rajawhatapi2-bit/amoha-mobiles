export async function register() {
  // Polyfill performance.clearMarks for environments where it's unavailable
  // (affects some Vercel/Node.js build workers with Next.js 14)
  if (typeof globalThis.performance !== 'undefined') {
    const perf = globalThis.performance as Record<string, unknown>;
    if (typeof perf.clearMarks !== 'function') {
      perf.clearMarks = () => {};
    }
    if (typeof perf.clearMeasures !== 'function') {
      perf.clearMeasures = () => {};
    }
    if (typeof perf.clearResourceTimings !== 'function') {
      perf.clearResourceTimings = () => {};
    }
  }
}
