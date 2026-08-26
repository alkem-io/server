import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhiteboardDraftService } from './whiteboard.draft.service';

describe('WhiteboardDraftService', () => {
  const actorContext = {
    actorID: '6c0552d4-a1e6-4e52-b008-28c3fbd29e67',
  } as ActorContext;
  const parentAuthorization = { id: 'parent-auth' } as IAuthorizationPolicy;
  let repository: Pick<Repository<Whiteboard>, 'find' | 'findOne'>;
  let whiteboardService: Pick<
    WhiteboardService,
    'createWhiteboard' | 'deleteWhiteboard'
  >;
  const whiteboardAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
  const authorizationPolicyService = { saveAll: vi.fn() };
  let service: WhiteboardDraftService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = { find: vi.fn(), findOne: vi.fn() };
    whiteboardService = {
      createWhiteboard: vi.fn(),
      deleteWhiteboard: vi.fn(),
    };
    service = new WhiteboardDraftService(
      repository as Repository<Whiteboard>,
      whiteboardService as WhiteboardService,
      whiteboardAuthorizationService as unknown as WhiteboardAuthorizationService,
      authorizationPolicyService as unknown as AuthorizationPolicyService
    );
    whiteboardAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      []
    );
  });

  it('creates an ordinary Whiteboard with only a draft expiry marker', async () => {
    vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
      id: 'wb-1',
    } as Whiteboard);

    const result = await service.materialize(
      {},
      {} as IStorageAggregator,
      parentAuthorization,
      actorContext
    );

    expect(whiteboardService.createWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        draftExpiresAt: expect.any(Date),
        profile: { displayName: 'Whiteboard draft' },
      }),
      expect.anything(),
      actorContext
    );
    expect(result).toBe('wb-1');
    expect(
      whiteboardAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('wb-1', parentAuthorization);
    expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([]);
  });

  it('deletes the draft when its authorization cannot be initialized', async () => {
    vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
      id: 'wb-1',
    } as Whiteboard);
    whiteboardAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
      new Error('authorization failed')
    );

    await expect(
      service.materialize(
        {},
        {} as IStorageAggregator,
        parentAuthorization,
        actorContext
      )
    ).rejects.toThrow('authorization failed');

    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('wb-1');
  });

  it('refuses an ordinary Whiteboard as a draft source', async () => {
    vi.mocked(repository.findOne).mockResolvedValue({
      id: 'ordinary-wb',
      createdBy: actorContext.actorID,
      draftExpiresAt: null,
    } as Whiteboard);

    await expect(
      service.getForConsumption('ordinary-wb', actorContext)
    ).rejects.toThrow('Whiteboard draft not found');
  });

  it('refuses a draft owned by another actor', async () => {
    vi.mocked(repository.findOne).mockResolvedValue({
      id: 'draft-wb',
      createdBy: 'other-actor',
      draftExpiresAt: new Date(Date.now() + 60_000),
    } as Whiteboard);

    await expect(
      service.getForConsumption('draft-wb', actorContext)
    ).rejects.toThrow(
      'Only the actor that created a Whiteboard draft may consume it'
    );
  });

  it('refuses an expired draft as a final-create source', async () => {
    vi.mocked(repository.findOne).mockResolvedValue({
      id: 'draft-wb',
      createdBy: actorContext.actorID,
      draftExpiresAt: new Date(Date.now() - 1),
    } as Whiteboard);

    await expect(
      service.getForConsumption('draft-wb', actorContext)
    ).rejects.toThrow('Whiteboard draft has expired');
  });

  it('does not delete an ordinary Whiteboard even when cleanup receives its id', async () => {
    vi.mocked(repository.findOne).mockResolvedValue(null);

    await service.cleanupConsumed('ordinary-wb');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'ordinary-wb', draftExpiresAt: expect.anything() },
    });
    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
  });

  it('periodic cleanup discovers only expired non-NULL draft expiries', async () => {
    vi.mocked(repository.find).mockResolvedValue([
      { id: 'expired-draft' } as Whiteboard,
    ]);

    await expect(service.findExpired(25)).resolves.toEqual(['expired-draft']);

    expect(repository.find).toHaveBeenCalledWith({
      select: { id: true },
      where: { draftExpiresAt: expect.anything() },
      order: { draftExpiresAt: 'ASC' },
      take: 25,
    });
  });

  it('rechecks exact id and expired draftness before periodic deletion', async () => {
    vi.mocked(repository.findOne).mockResolvedValue({
      id: 'expired-draft',
    } as Whiteboard);

    await service.cleanupExpired('expired-draft');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'expired-draft', draftExpiresAt: expect.anything() },
    });
    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith(
      'expired-draft'
    );
  });

  it('explicit discard requires creator ownership and a non-NULL expiry', async () => {
    vi.mocked(repository.findOne).mockResolvedValue({
      id: 'draft-wb',
      createdBy: actorContext.actorID,
      draftExpiresAt: new Date(Date.now() + 60_000),
    } as Whiteboard);

    await expect(service.discard('draft-wb', actorContext)).resolves.toBe(
      'draft-wb'
    );
    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('draft-wb');
  });
});
