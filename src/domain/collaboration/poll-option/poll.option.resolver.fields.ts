import { UserLoaderCreator } from '@core/dataloader/creators/loader.creators/user.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PollOption } from './poll.option.entity';
import { IPollOption } from './poll.option.interface';

type EnrichedPollOption = PollOption & { voterIds?: string[] | null };

@Resolver(() => IPollOption)
export class PollOptionFieldsResolver {
  @ResolveField('voters', () => [IUser], {
    nullable: true,
    description:
      'List of space members who voted for this option. Null when results are hidden or resultsDetail is not FULL.',
  })
  async voters(
    @Parent() option: EnrichedPollOption,
    @Loader(UserLoaderCreator) loader: ILoader<IUser>
  ): Promise<IUser[] | null> {
    const voterIds = option.voterIds;
    if (voterIds === null || voterIds === undefined) return null;
    if (voterIds.length === 0) return [];

    const results = await loader.loadMany(voterIds);
    // Filter out errors (e.g. deleted users whose cascade may not have run yet)
    return results.filter(
      (r): r is IUser => !(r instanceof Error) && r !== null
    );
  }
}
