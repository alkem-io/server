import {
  LIFECYCLE_DEFINITION_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateLifecycleTemplateInput extends CreateTemplateBaseInput {
  @Field(() => LifecycleType, {
    nullable: false,
    description: 'The type of the Lifecycles that this Template supports.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field(() => LifecycleDefinitionScalar, {
    nullable: true,
    description: 'The XState definition for this LifecycleTemplate.',
  })
  @IsOptional()
  @MaxLength(LIFECYCLE_DEFINITION_LENGTH)
  definition?: string;
}
