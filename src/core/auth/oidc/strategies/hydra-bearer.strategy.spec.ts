import { ActorContext } from '@core/actor-context/actor.context';
import { SecondFactorPolicyService } from '@core/auth/second-factor/second-factor.policy.service';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { SecondFactorRequiredError } from './auth.errors';
import { HydraBearerStrategy } from './hydra-bearer.strategy';
import { HydraBearerValidator } from './hydra-bearer.validator';

async function build(opts: {
  acr?: string;
  assertNotRefused?: (actor: ActorContext, now: Date) => Promise<void>;
}) {
  const cachedContext = Object.assign(new ActorContext(), {
    actorID: 'actor-1',
    credentials: [{ type: 'platform-support', resourceID: '' }],
  });
  const validator = {
    validateAuthorizationHeader: vi.fn().mockResolvedValue({
      actorContext: cachedContext,
      ctx: {
        sub: 'kratos-identity-id',
        alkemio_actor_id: 'actor-1',
        client_id: 'alkemio-web',
        ...(opts.acr === undefined ? {} : { acr: opts.acr }),
      },
    }),
  };
  const secondFactorPolicy = {
    assertNotRefused: vi.fn(opts.assertNotRefused ?? (() => Promise.resolve())),
  };
  const module = await Test.createTestingModule({
    providers: [
      HydraBearerStrategy,
      { provide: HydraBearerValidator, useValue: validator },
      { provide: SecondFactorPolicyService, useValue: secondFactorPolicy },
    ],
  }).compile();
  return {
    strategy: module.get(HydraBearerStrategy),
    cachedContext,
    secondFactorPolicy,
  };
}

const request = () => ({ headers: { authorization: 'Bearer token' } }) as any;

async function captureStdout<T>(
  run: () => Promise<T>
): Promise<{ result?: T; error?: unknown; records: any[] }> {
  const records: any[] = [];
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: any) => {
      try {
        records.push(JSON.parse(String(chunk)));
      } catch {
        // Not an audit record.
      }
      return true;
    });
  try {
    return { result: await run(), records };
  } catch (error) {
    return { error, records };
  } finally {
    spy.mockRestore();
  }
}

const refusalEvents = (records: any[]) =>
  records.filter(r => r.event_type === 'auth.second_factor.refused');

/** A covered actor past the deadline: the policy refuses unless satisfied. */
const refuseUnlessSatisfied = async (actor: ActorContext) => {
  if (!actor.secondFactor?.satisfied) throw new SecondFactorRequiredError();
};

describe('HydraBearerStrategy — the second factor of the sign-in', () => {
  it("returns a stamped copy for an 'aal2' token, leaving the validator's actor untouched", async () => {
    const { strategy, cachedContext } = await build({ acr: 'aal2' });
    const req = request();

    const result = await strategy.validate(req);

    expect(result).not.toBe(cachedContext);
    expect(result?.actorID).toBe('actor-1');
    expect(result?.secondFactor).toEqual({ satisfied: true });
    expect(cachedContext.secondFactor).toBeUndefined();
    expect(req.alkemioBearer).toMatchObject({
      sub: 'kratos-identity-id',
      alkemio_actor_id: 'actor-1',
      client_id: 'alkemio-web',
    });
  });

  it.each([
    ['aal1', 'aal1'],
    ['absent', undefined],
  ])('stamps not satisfied when acr is %s', async (_label, acr) => {
    const { strategy } = await build({ acr });

    const result = await strategy.validate(request());

    expect(result?.secondFactor).toEqual({ satisfied: false });
  });

  it('stamps no ways: a bearer token carries no session to hold them', async () => {
    const { strategy } = await build({ acr: 'aal2' });

    const result = await strategy.validate(request());

    expect(result?.secondFactor).not.toHaveProperty('ways');
  });

  it('asks the policy about the stamped copy', async () => {
    const { strategy, secondFactorPolicy } = await build({ acr: 'aal1' });

    const result = await strategy.validate(request());

    expect(secondFactorPolicy.assertNotRefused).toHaveBeenCalledWith(
      result,
      expect.any(Date)
    );
  });

  // The session route hands the browser its web ID token, which verifies
  // against the same issuer and audience allow-list. The strategy decides on
  // `acr` alone, never on the token's type or audience.
  it.each([
    ['aal1', 'aal1'],
    ['no acr at all', undefined],
  ])('refuses a covered actor past the deadline presenting a token with %s', async (_label, acr) => {
    const { strategy } = await build({
      acr,
      assertNotRefused: refuseUnlessSatisfied,
    });

    const { error, records } = await captureStdout(() =>
      strategy.validate(request())
    );

    expect(error).toBeInstanceOf(SecondFactorRequiredError);
    const events = refusalEvents(records);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event_type: 'auth.second_factor.refused',
      outcome: 'failure',
      error_code: 'second_factor_required',
      sub: 'kratos-identity-id',
      client_id: 'alkemio-web',
      correlation_id: expect.any(String),
      request_id: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it("serves the same covered actor presenting an 'aal2' token, with no refusal event", async () => {
    const { strategy } = await build({
      acr: 'aal2',
      assertNotRefused: refuseUnlessSatisfied,
    });

    const { result, records } = await captureStdout(() =>
      strategy.validate(request())
    );

    expect(result?.actorID).toBe('actor-1');
    expect(refusalEvents(records)).toEqual([]);
  });

  it('rejects with a failed rule read unchanged, and records no refusal', async () => {
    const failure = new Error('connection terminated');
    const { strategy } = await build({
      acr: 'aal1',
      assertNotRefused: () => Promise.reject(failure),
    });

    const { error, records } = await captureStdout(() =>
      strategy.validate(request())
    );

    expect(error).toBe(failure);
    expect(refusalEvents(records)).toEqual([]);
  });
});
