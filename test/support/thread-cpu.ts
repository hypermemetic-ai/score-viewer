/**
 * CPU time of the calling thread, for cost checks on a shared host.
 *
 * Wall time counts every other process's turn on the core, so a wall-clock
 * bound fails whenever the host is busy. The thread's own CPU time counts
 * only this work. A Node without the per-thread counter falls back to the
 * process's.
 */
export function threadCpuMs(): number {
  const used = typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage() : process.cpuUsage();
  return (used.user + used.system) / 1000;
}
