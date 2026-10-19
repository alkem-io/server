import { createBatchLoader } from '@core/dataloader/utils/createTypedBatchLoader';
import { vi } from 'vitest';
import { CalloutActivityLoaderCreator } from './callout/callout.activity.loader.creator';
import { CalloutMyReactionLoaderCreator } from './callout/callout.my.reaction.loader.creator';
import { CalloutReactionsSummaryLoaderCreator } from './callout/callout.reactions.summary.loader.creator';
import { CalloutTaskColumnCountsLoaderCreator } from './callout/callout.task.column.counts.loader.creator';
import { ContributorByAgentIdLoaderCreator } from './collaboration/contributor.by.agent.id.loader.creator';
import { ConversationMembershipsLoaderCreator } from './conversation/conversation.memberships.loader.creator';
import { ActorLoaderCreator } from './in-app-notification/actor.loader.creator';
import { LeadOrganizationsByRoleSetLoaderCreator } from './roleset/lead.organizations.by.role.set.loader.creator';
import { LeadUsersByRoleSetLoaderCreator } from './roleset/lead.users.by.role.set.loader.creator';
import { SpaceBySpaceAboutIdLoaderCreator } from './space/space.by.space.about.id.loader.creator';
import { SpaceMetricsLoaderCreator } from './space/space.metrics.loader.creator';
import { SpaceProviderLoaderCreator } from './space/space.provider.loader.creator';
import { SpaceAboutClassificationsLoaderCreator } from './space.about.classifications.loader.creator';

// The DataLoaderInterceptor disables the loader cache for subscription
// contexts by passing `cache: false` to `create()`. A subscription keeps one
// GraphQL context (and so one loader) for its whole lifetime, so a loader that
// ignores the option serves the first resolution to every later event.

const loadTwice = async (loader: { load: (key: string) => Promise<any> }) => {
  await loader.load('id-1');
  await loader.load('id-1');
};

const creatorsWithBatchMethod: Array<[new (dep: any) => any, string]> = [
  [CalloutActivityLoaderCreator, 'batchLoad'],
  [CalloutReactionsSummaryLoaderCreator, 'batchLoad'],
  [CalloutTaskColumnCountsLoaderCreator, 'batchLoad'],
  [ContributorByAgentIdLoaderCreator, 'batchLoadByAgentIds'],
  [ConversationMembershipsLoaderCreator, 'batchLoadMemberships'],
  [LeadOrganizationsByRoleSetLoaderCreator, 'batchLoadOrganizations'],
  [LeadUsersByRoleSetLoaderCreator, 'batchLoadUsers'],
  [SpaceBySpaceAboutIdLoaderCreator, 'batchLoadBySpaceAboutIds'],
  [SpaceMetricsLoaderCreator, 'batchLoad'],
  [SpaceProviderLoaderCreator, 'batchLoad'],
];

describe('creators honour cache: false', () => {
  for (const [Creator, batchMethod] of creatorsWithBatchMethod) {
    it(`${Creator.name} re-runs the batch for a repeated key`, async () => {
      const creator = new Creator({});
      const batch = vi
        .spyOn(creator, batchMethod)
        .mockImplementation(async (ids: any) => ids.map(() => null));

      await loadTwice(creator.create({ cache: false } as any));

      expect(batch).toHaveBeenCalledTimes(2);
    });
  }
});

describe('loaders built without a batch-method seam honour cache: false', () => {
  it('createBatchLoader re-runs the batch for a repeated key', async () => {
    const batch = vi.fn(async () => []);

    await loadTwice(
      createBatchLoader(batch, {
        name: 'test',
        loadedTypeName: 'Test',
        resolveToNull: true,
        cache: false,
      })
    );

    expect(batch).toHaveBeenCalledTimes(2);
  });

  it(`${ActorLoaderCreator.name} forwards the option to createBatchLoader`, async () => {
    const manager = { find: vi.fn(async () => []) };
    const creator = new ActorLoaderCreator(manager as any);

    await loadTwice(
      creator.create({ cache: false, resolveToNull: true } as any)
    );

    expect(manager.find).toHaveBeenCalledTimes(2);
  });

  it(`${SpaceAboutClassificationsLoaderCreator.name} re-queries a repeated key`, async () => {
    const getRawAndEntities = vi.fn(async () => ({ entities: [], raw: [] }));
    const queryBuilder: any = {
      addSelect: () => queryBuilder,
      where: () => queryBuilder,
      orderBy: () => queryBuilder,
      getRawAndEntities,
    };
    const manager = {
      getRepository: () => ({ createQueryBuilder: () => queryBuilder }),
    };
    const creator = new SpaceAboutClassificationsLoaderCreator(manager as any);

    await loadTwice(creator.create({ cache: false } as any));

    expect(getRawAndEntities).toHaveBeenCalledTimes(2);
  });
});

describe(CalloutMyReactionLoaderCreator.name, () => {
  // Not created through the interceptor: on a subscription the request-scoped
  // instance lives for the whole operation, so it must never cache.
  it('re-queries the same callout for the same user', async () => {
    const reactionService = {
      getMyReactionsForEntities: vi.fn(async () => new Map()),
    };
    const creator = new CalloutMyReactionLoaderCreator(reactionService as any);

    await creator.loadMyReaction('callout-1', 'user-1');
    await creator.loadMyReaction('callout-1', 'user-1');

    expect(reactionService.getMyReactionsForEntities).toHaveBeenCalledTimes(2);
  });
});
