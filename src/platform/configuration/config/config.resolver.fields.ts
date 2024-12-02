import {
  VisualConstraints,
  VISUAL_CONSTRAINTS,
} from '@domain/common/visual/visual.constraints';
import { Args, ResolveField } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { IConfig } from './config.interface';
import { VisualType } from '@common/enums/visual.type';

@Resolver(() => IConfig)
export class ConfigurationResolverFields {
  @ResolveField(() => VisualConstraints, {
    nullable: false,
    description: 'Visual constraints for the given type',
  })
  visualConstraints(
    @Args('type', { type: () => VisualType }) visualTypeInput: VisualType
  ): VisualConstraints {
    return VISUAL_CONSTRAINTS[visualTypeInput];
  }
}
