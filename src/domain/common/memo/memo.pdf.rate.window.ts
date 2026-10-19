/**
 * A per-actor sliding-window counter, local to one server instance. `take`
 * admits at most `limit` calls per actor within any `windowMs`, and otherwise
 * answers how long until the oldest call in the window expires. Actors with no
 * call inside the window are dropped on a sweep at most once per window, so
 * memory stays bounded by the actors active in the last two windows.
 */
export class ActorRateWindow {
  private readonly calls = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  take(
    actorId: string
  ): { admitted: true } | { admitted: false; retryAfterMs: number } {
    const now = this.now();
    const since = now - this.windowMs;
    if (now - this.lastSweep >= this.windowMs) {
      this.lastSweep = now;
      for (const [actor, times] of this.calls)
        if (times[times.length - 1] <= since) this.calls.delete(actor);
    }
    const recent = (this.calls.get(actorId) ?? []).filter(time => time > since);
    if (recent.length >= this.limit) {
      this.calls.set(actorId, recent);
      return { admitted: false, retryAfterMs: recent[0] + this.windowMs - now };
    }
    recent.push(now);
    this.calls.set(actorId, recent);
    return { admitted: true };
  }

  /** Number of actors currently tracked; exposed for tests. */
  get size(): number {
    return this.calls.size;
  }
}
