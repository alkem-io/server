import { Profiling } from '@common/decorators/profiling.decorator';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IAspect } from './aspect.interface';
import { AspectService } from './aspect.service';

@Resolver(() => IAspect)
export class AspectResolverFields {
  constructor(private aspectService: AspectService) {}

  @ResolveField('createdBy', () => UUID, {
    nullable: false,
    description: 'The id of the user that created this Aspect',
  })
  async createdBy(@Parent() aspect: IAspect): Promise<string> {
    const createdBy = aspect.createdBy;
    if (!createdBy) return '';
    return createdBy;
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
        'Avatar visual not defined',
        LogContext.COMMUNITY
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
    if (!aspect.banner) {
      throw new EntityNotInitializedException(
        'Avatar visual not defined',
        LogContext.COMMUNITY
      );
    }
    return aspect.banner;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('discussion', () => IDiscussion, {
    nullable: true,
    description: 'The discussion for this Aspect.',
  })
  @Profiling.api
  async discussion(@Parent() aspect: IAspect): Promise<IDiscussion> {
    if (!aspect.discussion) {
      throw new EntityNotInitializedException(
        'Avatar discussion not defined',
        LogContext.COMMUNITY
      );
    }
    return aspect.discussion;
  }
}
