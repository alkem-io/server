import { ActorRateWindow } from './memo.pdf.rate.window';

describe('ActorRateWindow', () => {
  const setup = (limit = 2, windowMs = 60_000) => {
    let now = 1_000_000;
    const window = new ActorRateWindow(limit, windowMs, () => now);
    return {
      window,
      advance: (ms: number) => {
        now += ms;
      },
    };
  };

  it('admits up to the limit per actor and refuses the next call with the wait until the oldest expires', () => {
    const { window, advance } = setup();

    expect(window.take('actor-1')).toEqual({ admitted: true });
    advance(10_000);
    expect(window.take('actor-1')).toEqual({ admitted: true });
    advance(5_000);

    expect(window.take('actor-1')).toEqual({
      admitted: false,
      retryAfterMs: 45_000,
    });
  });

  it('counts each actor separately', () => {
    const { window } = setup(1);

    expect(window.take('actor-1').admitted).toBe(true);
    expect(window.take('actor-2').admitted).toBe(true);
    expect(window.take('actor-1').admitted).toBe(false);
  });

  it('does not count refused calls against the actor', () => {
    const { window, advance } = setup(1);

    window.take('actor-1');
    advance(30_000);
    window.take('actor-1');
    advance(30_000);

    expect(window.take('actor-1').admitted).toBe(true);
  });

  it('admits again once the window has slid past the oldest call', () => {
    const { window, advance } = setup(1);

    window.take('actor-1');
    advance(59_999);
    expect(window.take('actor-1').admitted).toBe(false);
    advance(1);

    expect(window.take('actor-1').admitted).toBe(true);
  });

  it('drops actors with no call inside the window', () => {
    const { window, advance } = setup();

    window.take('actor-1');
    window.take('actor-2');
    advance(60_000);
    window.take('actor-3');

    expect(window.size).toBe(1);
  });
});
