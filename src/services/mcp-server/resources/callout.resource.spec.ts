import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { CalloutResourceProvider } from './callout.resource';

/**
 * workspace#084 SEC-R1. This resource is gated on READ ALONE
 * (`mcp-server.service.ts` checks the callout's policy for
 * AuthorizationPrivilege.READ) and is reachable with an ordinary
 * `alkemio_session` browser cookie on POST /rest/mcp — no API key, and
 * MCP_ENABLED is "true" in the deployed config.
 *
 * So whatever this provider puts in the body is served to every actor who can
 * merely READ the callout. It used to emit `settings: callout.settings`, the
 * raw jsonb, which carried `framing.selection.selectedIds` — the admin's
 * curated space list. A registered non-member could read it, diff it against
 * the spaces they can actually see, and recover the exact count and the UUIDs
 * of the spaces withheld from them. That is precisely what AC6's notice exists
 * to withhold, and it defeated the redaction on `Callout.settings` through a
 * second surface.
 *
 * These cases exist so the blob cannot come back unnoticed. They are RED if
 * anyone restores the spread, and they are the only coverage this provider's
 * settings payload has.
 */

const CALLOUT_ID = 'callout-1';
const URI = `alkemio://callouts/${CALLOUT_ID}`;
const ctx = Object.assign(new ActorContext(), { actorID: 'actor-1' });

const buildProvider = () => {
  const calloutService = {
    getCalloutOrFail: vi.fn().mockResolvedValue({
      id: CALLOUT_ID,
      nameID: 'a-callout',
      createdDate: new Date('2026-01-01T00:00:00.000Z'),
      framing: {
        type: 'spaces',
        profile: { displayName: 'Related initiatives', description: 'd' },
      },
      settings: {
        visibility: 'published',
        contribution: { allowedTypes: ['post'], enabled: true },
        framing: {
          commentsEnabled: true,
          // The secret, and its siblings that must not ride along either.
          selection: {
            mode: 'custom',
            selectedIds: ['secret-space-a', 'secret-space-b'],
          },
          spaces: { cardVariant: 'COMPACT' },
        },
      },
      contributionDefaults: undefined,
    }),
    getContributions: vi.fn().mockResolvedValue([]),
  };
  const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return new CalloutResourceProvider(calloutService as any, logger as any);
};

const readBody = async () => {
  const result = await buildProvider().read(URI, ctx);
  const text = (result.contents[0] as { text: string }).text;
  return { text, parsed: JSON.parse(text) };
};

describe('CalloutResourceProvider — the settings payload (SEC-R1)', () => {
  it('never serves the curated selection, by id or by count', async () => {
    const { text, parsed } = await readBody();

    // Against the whole serialized body, not just the parsed shape: a nested
    // or renamed carrier would still fail this.
    expect(text).not.toContain('secret-space-a');
    expect(text).not.toContain('secret-space-b');
    expect(text).not.toContain('selectedIds');
    expect(parsed.settings?.framing?.selection).toBeUndefined();
  });

  it('serves only the three fields this resource uses', async () => {
    const { parsed } = await readBody();

    expect(Object.keys(parsed.settings).sort()).toEqual([
      'contribution',
      'framing',
      'visibility',
    ]);
    expect(Object.keys(parsed.settings.framing)).toEqual(['commentsEnabled']);
    expect(Object.keys(parsed.settings.contribution)).toEqual(['allowedTypes']);
  });

  it('still serves what it is supposed to', async () => {
    const { parsed } = await readBody();

    expect(parsed.settings.visibility).toBe('published');
    expect(parsed.settings.contribution.allowedTypes).toEqual(['post']);
    expect(parsed.settings.framing.commentsEnabled).toBe(true);
  });
});
