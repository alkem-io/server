import { AuthorizationPrivilege } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { describe, expect, it, vi } from 'vitest';
import { AdminTemplateFileRepairResolverMutations } from './admin.template.file.repair.resolver.mutations';

const result = {
  dryRun: true,
  templatesScanned: 4,
  templatesWithForeignFiles: 1,
  references: [],
  copiedReferences: 0,
  failed: [],
};

const createResolver = () => {
  const authorization = { grantAccessOrFail: vi.fn() };
  const platformPolicy = { id: 'platform-policy' };
  const platformAuthorization = {
    getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue(platformPolicy),
  };
  const audit = { recordOperation: vi.fn().mockResolvedValue(undefined) };
  const repair = { repair: vi.fn().mockResolvedValue(result) };
  const resolver = new AdminTemplateFileRepairResolverMutations(
    authorization as any,
    platformAuthorization as any,
    audit as any,
    repair as any
  );
  const actor = { actorID: 'actor-1' } as ActorContext;
  return { resolver, authorization, platformPolicy, audit, repair, actor };
};

describe('AdminTemplateFileRepairResolverMutations', () => {
  it('requires PLATFORM_OPERATIONS_ADMIN on the platform policy and audits the run', async () => {
    const ctx = createResolver();

    await expect(
      ctx.resolver.adminRepairTemplateFiles(ctx.actor, { dryRun: true })
    ).resolves.toBe(result);

    expect(ctx.authorization.grantAccessOrFail).toHaveBeenCalledWith(
      ctx.actor,
      ctx.platformPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      'adminRepairTemplateFiles'
    );
    expect(ctx.repair.repair).toHaveBeenCalledWith(undefined, true, ctx.actor);
    expect(ctx.audit.recordOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        actorID: 'actor-1',
        action: 'adminRepairTemplateFiles',
        outcome: 'success',
      })
    );
  });

  it('touches nothing when the caller lacks the privilege', async () => {
    const ctx = createResolver();
    ctx.authorization.grantAccessOrFail.mockImplementation(() => {
      throw new ForbiddenAuthorizationPolicyException(
        'denied',
        AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
        'platform-policy',
        'actor-1'
      );
    });

    await expect(
      ctx.resolver.adminRepairTemplateFiles(ctx.actor, {
        dryRun: false,
        templateIDs: ['t-1'],
      })
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
    expect(ctx.repair.repair).not.toHaveBeenCalled();
  });
});
