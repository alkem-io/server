import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MemoSigningContinueInput } from '@domain/common/memo/dto/memo.signing.continue.input';
import { MemoSigningPrepareInput } from '@domain/common/memo/dto/memo.signing.prepare.input';
import { IMemo } from '@domain/common/memo/memo.interface';
import { MemoResolverMutations } from '@domain/common/memo/memo.resolver.mutations';
import { MemoService } from '@domain/common/memo/memo.service';
import { MemoAuthorizationService } from '@domain/common/memo/memo.service.authorization';
import { MemoSigningService } from '@domain/common/memo/memo.signing.service';
import { LoggerService } from '@nestjs/common';
import { validate } from 'class-validator';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';

const createResolver = () => {
  const authorizationService = {
    grantAccessOrFail: vi.fn(),
  } as unknown as Mocked<AuthorizationService>;

  const authorizationPolicyService = {
    saveAll: vi.fn(),
  } as unknown as Mocked<AuthorizationPolicyService>;

  const memoService = {
    getMemoOrFail: vi.fn(),
    updateMemo: vi.fn(),
    deleteMemo: vi.fn(),
  } as unknown as Mocked<MemoService>;

  const memoAuthService = {
    applyAuthorizationPolicy: vi.fn(),
  } as unknown as Mocked<MemoAuthorizationService>;

  const memoSigningService = {
    prepareMemoSigning: vi.fn(),
    continueMemoSigning: vi.fn(),
  } as unknown as Mocked<MemoSigningService>;

  const entityManager = {
    findOne: vi.fn(),
  } as unknown as Mocked<EntityManager>;

  const logger = {
    verbose: vi.fn(),
    warn: vi.fn(),
  } as unknown as Mocked<LoggerService>;

  const resolver = new MemoResolverMutations(
    authorizationService,
    authorizationPolicyService,
    memoService,
    memoAuthService,
    memoSigningService,
    entityManager,
    logger
  );

  return {
    resolver,
    authorizationService,
    memoService,
    memoAuthService,
    memoSigningService,
    authorizationPolicyService,
    entityManager,
  };
};

describe('MemoResolverMutations', () => {
  const actorContext = new ActorContext();
  actorContext.actorID = 'user-1';

  it('delegates server-owned signing preparation without accepting PDF input', async () => {
    const { resolver, memoSigningService } = createResolver();
    const result = {
      attemptId: 'attempt-1',
      previewUrl: '/api/private/rest/content-signing/attempt-1/snapshot',
    };
    memoSigningService.prepareMemoSigning.mockResolvedValue(result);

    await expect(
      resolver.prepareMemoSigning(actorContext, { memoID: 'memo-1' })
    ).resolves.toBe(result);
    expect(memoSigningService.prepareMemoSigning).toHaveBeenCalledWith(
      'memo-1',
      actorContext
    );
    expect(resolver.prepareMemoSigning).toHaveLength(2);
  });

  it('delegates continuation by attempt ID without accepting state or PDF', async () => {
    const { resolver, memoSigningService } = createResolver();
    const result = {
      authorizeUrl: 'https://connect.acc.cleverbase.com/authorize',
    };
    memoSigningService.continueMemoSigning.mockResolvedValue(result);

    await expect(
      resolver.continueMemoSigning(actorContext, { attemptID: 'attempt-1' })
    ).resolves.toBe(result);
    expect(memoSigningService.continueMemoSigning).toHaveBeenCalledWith(
      'attempt-1',
      actorContext
    );
    expect(resolver.continueMemoSigning).toHaveLength(2);
  });

  it.each([
    [MemoSigningPrepareInput, 'memoID'],
    [MemoSigningContinueInput, 'attemptID'],
  ])('validates %s as a UUID input', async (Input, field) => {
    const input = Object.assign(new Input(), { [field]: 'not-a-uuid' });

    await expect(validate(input)).resolves.toEqual([
      expect.objectContaining({ property: field }),
    ]);
  });

  describe('updateMemo', () => {
    it('authorizes and updates memo without re-applying auth when policy unchanged', async () => {
      const { resolver, authorizationService, memoService } = createResolver();

      const memo = {
        id: 'memo-1',
        contentUpdatePolicy: 'CONTRIBUTORS',
        authorization: { id: 'auth-1' },
      } as any;
      memoService.getMemoOrFail
        .mockResolvedValueOnce(memo)
        .mockResolvedValueOnce(memo);
      memoService.updateMemo.mockResolvedValueOnce(memo);

      const result = await resolver.updateMemo(actorContext, {
        ID: 'memo-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        memo.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(memoService.updateMemo).toHaveBeenCalledWith('memo-1', {
        ID: 'memo-1',
      });
      expect(result).toBe(memo);
    });

    it('re-applies auth policy via framing when contentUpdatePolicy changes', async () => {
      const {
        resolver,
        memoService,
        memoAuthService,
        authorizationPolicyService,
        entityManager,
      } = createResolver();

      const memo = {
        id: 'memo-1',
        contentUpdatePolicy: 'CONTRIBUTORS',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedMemo = { ...memo, contentUpdatePolicy: 'ADMINS' };

      memoService.getMemoOrFail
        .mockResolvedValueOnce(memo)
        .mockResolvedValueOnce(updatedMemo);
      memoService.updateMemo.mockResolvedValueOnce(updatedMemo);

      const framing = { authorization: { id: 'framing-auth-1' } } as any;
      entityManager.findOne.mockResolvedValueOnce(framing);
      memoAuthService.applyAuthorizationPolicy.mockResolvedValueOnce([]);
      authorizationPolicyService.saveAll.mockResolvedValueOnce(
        undefined as any
      );

      await resolver.updateMemo(actorContext, { ID: 'memo-1' } as any);

      expect(memoAuthService.applyAuthorizationPolicy).toHaveBeenCalledWith(
        'memo-1',
        framing.authorization
      );
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
    });

    it('re-applies auth policy via contribution when no framing found', async () => {
      const {
        resolver,
        memoService,
        memoAuthService,
        authorizationPolicyService,
        entityManager,
      } = createResolver();

      const memo = {
        id: 'memo-1',
        contentUpdatePolicy: 'CONTRIBUTORS',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedMemo = { ...memo, contentUpdatePolicy: 'ADMINS' };

      memoService.getMemoOrFail
        .mockResolvedValueOnce(memo)
        .mockResolvedValueOnce(updatedMemo);
      memoService.updateMemo.mockResolvedValueOnce(updatedMemo);

      // No framing
      entityManager.findOne.mockResolvedValueOnce(null);
      // Contribution found
      const contribution = {
        authorization: { id: 'contrib-auth-1' },
      } as any;
      entityManager.findOne.mockResolvedValueOnce(contribution);
      memoAuthService.applyAuthorizationPolicy.mockResolvedValueOnce([]);
      authorizationPolicyService.saveAll.mockResolvedValueOnce(
        undefined as any
      );

      await resolver.updateMemo(actorContext, { ID: 'memo-1' } as any);

      expect(memoAuthService.applyAuthorizationPolicy).toHaveBeenCalledWith(
        'memo-1',
        contribution.authorization
      );
    });

    it('skips auth re-application when neither framing nor contribution found', async () => {
      const { resolver, memoService, memoAuthService, entityManager } =
        createResolver();

      const memo = {
        id: 'memo-1',
        contentUpdatePolicy: 'CONTRIBUTORS',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedMemo = { ...memo, contentUpdatePolicy: 'ADMINS' };

      memoService.getMemoOrFail
        .mockResolvedValueOnce(memo)
        .mockResolvedValueOnce(updatedMemo);
      memoService.updateMemo.mockResolvedValueOnce(updatedMemo);

      entityManager.findOne.mockResolvedValueOnce(null);
      entityManager.findOne.mockResolvedValueOnce(null);

      await resolver.updateMemo(actorContext, { ID: 'memo-1' } as any);

      expect(memoAuthService.applyAuthorizationPolicy).not.toHaveBeenCalled();
    });
  });

  describe('deleteMemo', () => {
    it('authorizes with DELETE and delegates to memoService.deleteMemo', async () => {
      const { resolver, authorizationService, memoService } = createResolver();

      const memo = {
        id: 'memo-1',
        authorization: { id: 'auth-1' },
      } as unknown as IMemo;
      memoService.getMemoOrFail.mockResolvedValueOnce(memo);
      memoService.deleteMemo.mockResolvedValueOnce(memo);

      const result = await resolver.deleteMemo(actorContext, {
        ID: 'memo-1',
      });

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        memo.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(memoService.deleteMemo).toHaveBeenCalledWith('memo-1');
      expect(result).toBe(memo);
    });

    it('propagates errors from getMemoOrFail', async () => {
      const { resolver, memoService } = createResolver();
      memoService.getMemoOrFail.mockRejectedValueOnce(new Error('not found'));

      await expect(
        resolver.deleteMemo(actorContext, { ID: 'memo-unknown' })
      ).rejects.toThrow('not found');
    });
  });
});
