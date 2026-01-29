import { VisualType } from '@common/enums/visual.type';
import {
  DEFAULT_VISUAL_CONSTRAINTS,
  VisualConstraints,
} from '@domain/common/visual/visual.constraints';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { IConfig } from './config.interface';

@Resolver(() => IConfig)
export class ConfigurationResolverFields {
  @ResolveField(() => VisualConstraints, {
    nullable: false,
    description: 'Visual constraints for the given type',
  })
  defaultVisualTypeConstraints(
    @Args('type', { type: () => VisualType }) visualTypeInput: VisualType
  ): VisualConstraints {
    return DEFAULT_VISUAL_CONSTRAINTS[visualTypeInput];
  }
}
