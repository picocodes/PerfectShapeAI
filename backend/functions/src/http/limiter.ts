/** Best-effort per-instance limiter. The daily quota in the database is the real spend cap. */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number
  ) {}

  allow(key: string): boolean {
    const time = this.now();
    const recent = (this.hits.get(key) ?? []).filter((hit) => time - hit < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(time);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }
}
