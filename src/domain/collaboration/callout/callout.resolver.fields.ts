import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { UUID_NAMEID } from '@domain/common/scalars';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { IUser } from '@domain/community/user/user.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import {
  CalloutPostTemplateLoaderCreator,
  CalloutWhiteboardTemplateLoaderCreator,
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';

@Resolver(() => ICallout)
export class CalloutResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calloutService: CalloutService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Callout.',
  })
  @Profiling.api
  async profile(
    @Parent() callout: ICallout,
    @Loader(ProfileLoaderCreator, { parentClassRef: Callout })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(callout.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aspects', () => [IAspect], {
    nullable: true,
    description: 'The Aspects for this Callout.',
  })
  @Profiling.api
  async aspects(
    @Parent() callout: Callout,
    @Args({
      name: 'IDs',
      type: () => [UUID_NAMEID],
      description: 'The IDs (either UUID or nameID) of the Aspects to return',
      nullable: true,
    })
    ids: string[],
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Aspects to return; if omitted returns all Aspects.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Aspects based on a random selection.',
      nullable: true,
    })
    shuffle: boolean
  ): Promise<IAspect[]> {
    return await this.calloutService.getAspectsFromCallout(
      callout,
      ['aspects.comments'],
      ids,
      limit,
      shuffle
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('canvases', () => [ICanvas], {
    nullable: true,
    description: 'The Canvas entities for this Callout.',
  })
  @Profiling.api
  async canvases(
    @Parent() callout: Callout,
    @Args({
      name: 'IDs',
      type: () => [UUID_NAMEID],
      description: 'The IDs of the canvases to return',
      nullable: true,
    })
    ids: string[],
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Canvases to return; if omitted return all Canvases.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Canvases based on a random selection. Defaults to false.',
      nullable: true,
    })
    shuffle: boolean
  ): Promise<ICanvas[]> {
    return await this.calloutService.getCanvasesFromCallout(
      callout,
      ['canvases.checkout'],
      ids,
      limit,
      shuffle
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('postTemplate', () => IPostTemplate, {
    nullable: true,
    description: 'The PostTemplate for this Callout.',
  })
  async postTemplate(
    @Parent() callout: ICallout,
    @Loader(CalloutPostTemplateLoaderCreator, { resolveToNull: true })
    loader: ILoader<IPostTemplate>
  ): Promise<IPostTemplate | null> {
    return (
      loader
        .load(callout.id)
        // empty object is result because DataLoader does not allow to return NULL values
        // handle the value when the result is returned
        .then(x => (!Object.keys(x).length ? null : x))
    );
  }

  @ResolveField('activity', () => Number, {
    nullable: false,
    description: 'The activity for this Callout.',
  })
  async activity(@Parent() callout: ICallout): Promise<number> {
    return await this.calloutService.getActivityCount(callout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('whiteboardTemplate', () => IWhiteboardTemplate, {
    nullable: true,
    description: 'The Whiteboard template for this Callout.',
  })
  async whiteboardTemplate(
    @Parent() callout: ICallout,
    @Loader(CalloutWhiteboardTemplateLoaderCreator, { resolveToNull: true })
    loader: ILoader<IWhiteboardTemplate>
  ): Promise<IWhiteboardTemplate | null> {
    return (
      loader
        .load(callout.id)
        // empty object is result because DataLoader does not allow to return NULL values
        // handle the value when the result is returned
        .then(x => (!Object.keys(x).length ? null : x))
    );
  }

  @ResolveField('publishedBy', () => IUser, {
    nullable: true,
    description: 'The user that published this Callout',
  })
  async publishedBy(
    @Parent() callout: ICallout,
    @Loader(UserLoaderCreator, { resolveToNull: true }) loader: ILoader<IUser>
  ): Promise<IUser | null> {
    const publishedBy = callout.publishedBy;
    if (!publishedBy) {
      return null;
    }
    return loader.load(publishedBy);
  }

  @ResolveField('publishedDate', () => Number, {
    nullable: true,
    description: 'The timestamp for the publishing of this Callout.',
  })
  async publishedDate(@Parent() callout: ICallout): Promise<number> {
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
    @Loader(UserLoaderCreator, { resolveToNull: true }) loader: ILoader<IUser>
  ): Promise<IUser | null> {
    const createdBy = callout.createdBy;
    if (!createdBy) {
      return null;
    }

    try {
      return await loader
        .load(createdBy)
        // empty object is result because DataLoader does not allow to return NULL values
        // handle the value when the result is returned
        .then(x => {
          return !Object.keys(x).length ? null : x;
        });
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving callout '${callout.id}'`,
          LogContext.COLLABORATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
