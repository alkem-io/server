import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { Profiling } from '@common/decorators/profiling.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IAspect } from './aspect.interface';
import { AspectService } from './aspect.service';

@Resolver(() => IAspect)
export class AspectResolverFields {
  constructor(
    private aspectService: AspectService,
    private userService: UserService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: false,
    description: 'The user that created this Aspect',
  })
  async createdBy(@Parent() aspect: IAspect): Promise<IUser> {
    const createdBy = aspect.createdBy;
    if (!createdBy) {
      throw new EntityNotInitializedException(
        `CreatedBy not set on Aspect with id ${aspect.id}`,
        LogContext.COLLABORATION
      );
    }
    return await this.userService.getUserOrFail(createdBy);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('banner', () => IVisual, {
    nullable: true,
    description: 'The banner Visual for this Aspect.',
  })
  @Profiling.api
  async banner(@Parent() aspect: IAspect): Promise<IVisual> {
    if (!aspect.banner) {
      throw new EntityNotInitializedException(
        'Banner visual not defined',
        LogContext.COLLABORATION
      );
    }
    return aspect.banner;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('bannerNarrow', () => IVisual, {
    nullable: true,
    description: 'The narrow banner visual for this Aspect.',
  })
  @Profiling.api
  async bannerNarrow(@Parent() aspect: IAspect): Promise<IVisual> {
    if (!aspect.bannerNarrow) {
      throw new EntityNotInitializedException(
        'narrow banner visual not defined',
        LogContext.COLLABORATION
      );
    }
    return aspect.bannerNarrow;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: true,
    description: 'The Profile for this Card.',
  })
  @Profiling.api
  async profile(@Parent() aspect: IAspect): Promise<IProfile> {
    return await this.aspectService.getProfile(aspect);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IComments, {
    nullable: true,
    description: 'The comments for this Aspect.',
  })
  @Profiling.api
  async comments(@Parent() aspect: IAspect): Promise<IComments> {
    if (!aspect.comments) {
      throw new EntityNotInitializedException(
        'Aspect comments not defined',
        LogContext.COLLABORATION
      );
    }
    return aspect.comments;
  }
}
