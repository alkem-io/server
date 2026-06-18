import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { AssistantBudgetResourceProvider } from './assistant-budget.resource';

/**
 * T039 (budget subset) — the `alkemio://assistant/budget` MCP resource:
 *  - resolves the seeded `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH` LIMIT per account;
 *  - `tokensPerMonth: null` when no entitlement resolves (accountless edge / no
 *    entitlement row);
 *  - respects delegation: the budget is resolved for the ActorContext's own
 *    `actorID`, so user A's session can never return user B's `tokensPerMonth`;
 *  - `accessEnabled` mirrors the `ACCESS_VIRTUAL_ASSISTANT` privilege.
 *
 * It is a RESOURCE, not a tool — it is registered in RESOURCE_PROVIDERS, so it
 * never appears in `tools/list` and needs no capability classification.
 */
describe('AssistantBudgetResourceProvider', () => {
  const URI = 'alkemio://assistant/budget';

  const USER_A = 'user-a';
  const USER_B = 'user-b';
  const ACCOUNT_A = 'account-a';
  const ACCOUNT_B = 'account-b';

  // Per-user fixtures: account id, the seeded monthly-token limit (null = no
  // entitlement row), and whether the user holds ACCESS_VIRTUAL_ASSISTANT.
  const FIXTURES: Record<
    string,
    { accountId: string; limit: number | null; access: boolean }
  > = {
    [USER_A]: { accountId: ACCOUNT_A, limit: 10_000_000, access: true },
    [USER_B]: { accountId: ACCOUNT_B, limit: 1_000_000, access: true },
  };

  const buildProvider = () => {
    const userRepository = {
      findOne: vi.fn(async ({ where }: { where: { id: string } }) => {
        const fx = FIXTURES[where.id];
        return fx ? { id: where.id, accountID: fx.accountId } : null;
      }),
    };

    const accountLookupService = {
      getAccount: vi.fn(async (accountID: string) => {
        const entry = Object.values(FIXTURES).find(
          f => f.accountId === accountID
        );
        if (!entry) return null;
        const entitlements =
          entry.limit === null
            ? []
            : [
                {
                  type: LicenseEntitlementType.ACCOUNT_AI_ASSISTANT_TOKENS_MONTH,
                  limit: entry.limit,
                },
              ];
        return { id: accountID, license: { entitlements } };
      }),
    };

    const platformAuthPolicy = { id: 'platform-auth' };
    const platformAuthorizationService = {
      getPlatformAuthorizationPolicy: vi
        .fn()
        .mockResolvedValue(platformAuthPolicy),
    };

    // isAccessGranted consults the per-user fixture; this stands in for the
    // credential-based ACCESS_VIRTUAL_ASSISTANT resolution.
    const authorizationService = {
      isAccessGranted: vi.fn(
        (
          actorContext: ActorContext,
          _policy: unknown,
          privilege: AuthorizationPrivilege
        ) =>
          privilege === AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT &&
          (FIXTURES[actorContext.actorID]?.access ?? false)
      ),
    };

    const logger = { verbose: vi.fn() };

    const provider = new AssistantBudgetResourceProvider(
      userRepository as any,
      accountLookupService as any,
      authorizationService as any,
      platformAuthorizationService as any,
      logger as any
    );
    return { provider, authorizationService, accountLookupService };
  };

  const delegatedContext = (userId: string): ActorContext =>
    Object.assign(new ActorContext(), {
      actorID: userId,
      isAnonymous: false,
      delegationContext: {
        assistantActorId: 'assistant-1',
        onBehalfOfUserId: userId,
      },
    });

  const readBudget = async (
    provider: AssistantBudgetResourceProvider,
    userId: string
  ): Promise<{ accessEnabled: boolean; tokensPerMonth: number | null }> => {
    const result = await provider.read(URI, delegatedContext(userId));
    return JSON.parse(result.contents[0].text);
  };

  it('matches only the fixed budget URI', () => {
    const { provider } = buildProvider();
    expect(provider.matches(URI)).toBe(true);
    expect(provider.matches('alkemio://spaces/123')).toBe(false);
    expect(provider.matches('alkemio://assistant/other')).toBe(false);
  });

  it('exposes exactly one resource definition at the budget URI', () => {
    const { provider } = buildProvider();
    const defs = provider.getResourceDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].uri).toBe(URI);
    expect(defs[0].mimeType).toBe('application/json');
  });

  it('resolves the seeded ACCOUNT_AI_ASSISTANT_TOKENS_MONTH limit for the user', async () => {
    const { provider } = buildProvider();
    const budget = await readBudget(provider, USER_A);
    expect(budget.tokensPerMonth).toBe(10_000_000);
    expect(budget.accessEnabled).toBe(true);
  });

  it('respects delegation: each session resolves its OWN user (A never sees B)', async () => {
    const { provider } = buildProvider();
    const budgetA = await readBudget(provider, USER_A);
    const budgetB = await readBudget(provider, USER_B);
    expect(budgetA.tokensPerMonth).toBe(10_000_000);
    expect(budgetB.tokensPerMonth).toBe(1_000_000);
    // The two users have distinct allowances — neither leaks the other's.
    expect(budgetA.tokensPerMonth).not.toBe(budgetB.tokensPerMonth);
  });

  it('returns tokensPerMonth: null when no entitlement row resolves', async () => {
    FIXTURES['user-none'] = {
      accountId: 'account-none',
      limit: null,
      access: true,
    };
    const { provider } = buildProvider();
    const budget = await readBudget(provider, 'user-none');
    expect(budget.tokensPerMonth).toBeNull();
    expect(budget.accessEnabled).toBe(true);
    delete FIXTURES['user-none'];
  });

  it('returns tokensPerMonth: null for an accountless user', async () => {
    const { provider, accountLookupService } = buildProvider();
    // A user row with no accountID short-circuits before the account lookup.
    (accountLookupService.getAccount as any) = vi.fn();
    const ctx = Object.assign(new ActorContext(), {
      actorID: USER_A,
      isAnonymous: false,
    });
    // Re-point the repo to return a user without an account.
    (provider as any).userRepository.findOne = vi
      .fn()
      .mockResolvedValue({ id: USER_A, accountID: '' });
    const result = await provider.read(URI, ctx);
    const budget = JSON.parse(result.contents[0].text);
    expect(budget.tokensPerMonth).toBeNull();
    expect(accountLookupService.getAccount).not.toHaveBeenCalled();
  });

  it('accessEnabled reflects the ACCESS_VIRTUAL_ASSISTANT privilege', async () => {
    FIXTURES['user-noaccess'] = {
      accountId: 'account-na',
      limit: 5_000_000,
      access: false,
    };
    const { provider } = buildProvider();
    const budget = await readBudget(provider, 'user-noaccess');
    // Budget (amount) and access (privilege) are orthogonal: the user has an
    // allowance but no access privilege.
    expect(budget.accessEnabled).toBe(false);
    expect(budget.tokensPerMonth).toBe(5_000_000);
    delete FIXTURES['user-noaccess'];
  });

  it('resolves a non-throwing default for an anonymous context', async () => {
    const { provider, authorizationService } = buildProvider();
    const anon = Object.assign(new ActorContext(), {
      actorID: '',
      isAnonymous: true,
    });
    const result = await provider.read(URI, anon);
    const budget = JSON.parse(result.contents[0].text);
    expect(budget.accessEnabled).toBe(false);
    expect(budget.tokensPerMonth).toBeNull();
    // No privilege resolution attempted for an anonymous caller.
    expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
  });
});
