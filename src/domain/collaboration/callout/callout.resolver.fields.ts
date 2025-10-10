import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { AuthorizationAgentPrivilege } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { IRoom } from '@domain/communication/room/room.interface';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { IClassification } from '@domain/common/classification/classification.interface';
import { ContributionsFilterInput } from './dto/contributions.filter';
import { CalloutContributionsCountOutput } from './dto/callout.contributions.count.dto';

@Resolver(() => ICallout)
export class CalloutResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calloutService: CalloutService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributions', () => [ICalloutContribution], {
    nullable: false,
    description: 'The Contributions that have been made to this Callout.',
  })
  async contributions(
    @Parent() callout: Callout,
    @Args({
      name: 'filter',
      type: () => ContributionsFilterInput,
      description: 'Filter to apply to the Contributions returned.',
      nullable: true,
    })
    filter?: ContributionsFilterInput,
    @Args({
      name: 'limit',
      type: () => Int,
      description:
        'The number of Contributions to return; if omitted return all Contributions.',
      nullable: true,
    })
    limit?: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Contributions based on a random selection. Defaults to false.',
      nullable: true,
    })
    shuffle?: boolean
  ): Promise<ICalloutContribution[]> {
    return await this.calloutService.getContributions(
      callout,
      filter?.IDs,
      filter?.types,
      limit,
      shuffle
    );
  }
  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributionsCount', () => CalloutContributionsCountOutput, {
    nullable: false,
    description: 'The Contributions that have been made to this Callout.',
  })
  async contributionsCount(
    @Parent() callout: Callout
  ): Promise<CalloutContributionsCountOutput> {
    return await this.calloutService.getContributionsCount(callout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributionsCount2', () => CalloutContributionsCountOutput, {
    nullable: false,
    description:
      'Experimental duplicate of contributionsCount for contract testing.',
  })
  async contributionsCount2(
    @Parent() callout: Callout
  ): Promise<CalloutContributionsCountOutput> {
    return await this.calloutService.getContributionsCount(callout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IRoom, {
    nullable: true,
    description: 'The comments for this Callout.',
  })
  async comments(@Parent() callout: Callout): Promise<IRoom | undefined> {
    return await this.calloutService.getComments(callout.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('classification', () => IClassification, {
    nullable: true,
    description: 'The comments for this Callout.',
  })
  async classification(
    @Parent() callout: Callout
  ): Promise<IClassification | undefined> {
    // TODO: must be a loader, will be used a lot
    return await this.calloutService.getClassification(callout.id);
  }

  @ResolveField('activity', () => Number, {
    nullable: false,
    description:
      'The activity for this Callout. The number of Contributions if the callout allows contributions, or the number of comments if it does not.',
  })
  async activity(@Parent() callout: ICallout): Promise<number> {
    return await this.calloutService.getActivityCount(callout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributionDefaults', () => ICalloutContributionDefaults, {
    nullable: false,
    description: 'The Contribution Defaults for this Callout.',
  })
  async contributionDefaults(
    @Parent() callout: Callout
  ): Promise<ICalloutContributionDefaults> {
    return await this.calloutService.getContributionDefaults(callout.id);
  }

  @ResolveField('publishedBy', () => IUser, {
    nullable: true,
    description: 'The user that published this Callout',
  })
  async publishedBy(
    @Parent() callout: ICallout,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    if (!callout.publishedBy) {
      return null;
    }
    return loader.load(callout.publishedBy);
  }

  @ResolveField('publishedDate', () => Number, {
    nullable: true,
    description: 'The timestamp for the publishing of this Callout.',
  })
  async publishedDate(@Parent() callout: ICallout): Promise<number | null> {
    if (!callout.publishedDate) {
      return null;
    }
    const createdDate = callout.publishedDate;
    const date = new Date(createdDate);
    return date.getTime();
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Callout',
  })
  async createdBy(
    @Parent() callout: ICallout,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    if (!callout.createdBy) {
      return null;
    }
    return loader.load(callout.createdBy);
  }
}
