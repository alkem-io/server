import { describe, expect, it } from 'vitest';
import { AuthResetWorkerState } from './auth-reset.worker-state.service';

describe('AuthResetWorkerState', () => {
  it('tracks the in-flight count and never goes negative', () => {
    const state = new AuthResetWorkerState();
    expect(state.activeCount).toBe(0);

    state.begin();
    expect(state.activeCount).toBe(1);

    state.end();
    expect(state.activeCount).toBe(0);

    // Extra end() (defensive) must not underflow.
    state.end();
    expect(state.activeCount).toBe(0);
  });

  it('waitForIdle resolves true immediately when nothing is in flight', async () => {
    const state = new AuthResetWorkerState();
    await expect(state.waitForIdle(1000)).resolves.toBe(true);
  });

  it('waitForIdle resolves false when a job is still in flight at the deadline', async () => {
    const state = new AuthResetWorkerState();
    state.begin();
    // Short timeout, short poll — job never ends, so it must time out to false.
    await expect(state.waitForIdle(30, 5)).resolves.toBe(false);
  });

  it('waitForIdle resolves true once the in-flight job ends', async () => {
    const state = new AuthResetWorkerState();
    state.begin();

    const pending = state.waitForIdle(1000, 5);
    // End the job on the next macrotask; waitForIdle should then observe idle.
    setTimeout(() => state.end(), 10);

    await expect(pending).resolves.toBe(true);
  });
});
