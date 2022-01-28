import { Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IProfile } from './profile.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  @UseGuards(GraphqlGuard)
  @ResolveField('avatar', () => IVisual, {
    nullable: true,
    description: 'The Visual avatar for this Profile.',
  })
  @Profiling.api
  async avatar(@Parent() profile: IProfile): Promise<IVisual> {
    if (!profile.avatar) {
      throw new EntityNotInitializedException(
        'Avatar visual not defined',
        LogContext.COMMUNITY
      );
    }
    return profile.avatar;
  }
}
