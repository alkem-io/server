import { vi } from 'vitest';
import { CalloutActivityLoaderCreator } from './callout/callout.activity.loader.creator';
import { CalloutReactionsSummaryLoaderCreator } from './callout/callout.reactions.summary.loader.creator';
import { CalloutTaskColumnCountsLoaderCreator } from './callout/callout.task.column.counts.loader.creator';
import { ContributorByAgentIdLoaderCreator } from './collaboration/contributor.by.agent.id.loader.creator';
import { ConversationMembershipsLoaderCreator } from './conversation/conversation.memberships.loader.creator';
import { LeadOrganizationsByRoleSetLoaderCreator } from './roleset/lead.organizations.by.role.set.loader.creator';
import { LeadUsersByRoleSetLoaderCreator } from './roleset/lead.users.by.role.set.loader.creator';
import { SpaceBySpaceAboutIdLoaderCreator } from './space/space.by.space.about.id.loader.creator';
import { SpaceMetricsLoaderCreator } from './space/space.metrics.loader.creator';
import { SpaceProviderLoaderCreator } from './space/space.provider.loader.creator';

// The DataLoaderInterceptor disables the loader cache for subscription
// contexts by passing `cache: false` to `create()`. A subscription keeps one
// GraphQL context (and so one loader) for its whole lifetime, so a creator
// that ignores the option serves the first resolution to every later event.
const creators: Array<[string, new (dep: any) => any, string]> = [
  ['CalloutActivityLoaderCreator', CalloutActivityLoaderCreator, 'batchLoad'],
  [
    'CalloutReactionsSummaryLoaderCreator',
    CalloutReactionsSummaryLoaderCreator,
    'batchLoad',
  ],
  [
    'CalloutTaskColumnCountsLoaderCreator',
    CalloutTaskColumnCountsLoaderCreator,
    'batchLoad',
  ],
  [
    'ContributorByAgentIdLoaderCreator',
    ContributorByAgentIdLoaderCreator,
    'batchLoadByAgentIds',
  ],
  [
    'ConversationMembershipsLoaderCreator',
    ConversationMembershipsLoaderCreator,
    'batchLoadMemberships',
  ],
  [
    'LeadOrganizationsByRoleSetLoaderCreator',
    LeadOrganizationsByRoleSetLoaderCreator,
    'batchLoadOrganizations',
  ],
  [
    'LeadUsersByRoleSetLoaderCreator',
    LeadUsersByRoleSetLoaderCreator,
    'batchLoadUsers',
  ],
  [
    'SpaceBySpaceAboutIdLoaderCreator',
    SpaceBySpaceAboutIdLoaderCreator,
    'batchLoadBySpaceAboutIds',
  ],
  ['SpaceMetricsLoaderCreator', SpaceMetricsLoaderCreator, 'batchLoad'],
  ['SpaceProviderLoaderCreator', SpaceProviderLoaderCreator, 'batchLoad'],
];

describe.each(creators)('%s cache option', (_name, Creator, batchMethod) => {
  const setup = () => {
    const creator = new Creator({});
    const batch = vi
      .spyOn(creator, batchMethod)
      .mockImplementation(async (ids: any) => ids.map(() => null));
    return { creator, batch };
  };

  it('re-runs the batch for a repeated key when cache is disabled', async () => {
    const { creator, batch } = setup();
    const loader = creator.create({ cache: false } as any);

    await loader.load('id-1');
    await loader.load('id-1');

    expect(batch).toHaveBeenCalledTimes(2);
  });

  it('caches a repeated key when cache is enabled', async () => {
    const { creator, batch } = setup();
    const loader = creator.create({ cache: true } as any);

    await loader.load('id-1');
    await loader.load('id-1');

    expect(batch).toHaveBeenCalledTimes(1);
  });

  it('caches by default when no options are passed', async () => {
    const { creator, batch } = setup();
    const loader = creator.create();

    await loader.load('id-1');
    await loader.load('id-1');

    expect(batch).toHaveBeenCalledTimes(1);
  });
});
