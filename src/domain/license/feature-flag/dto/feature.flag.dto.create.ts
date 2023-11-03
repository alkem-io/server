import { SMALL_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, MaxLength } from 'class-validator';

@InputType()
export abstract class CreateFeatureFlagInput {
  @Field(() => String, {
    description: 'The name of the feature flag',
    nullable: false,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => Boolean, {
    description: 'Is this feature flag enabled?',
    nullable: false,
  })
  @IsBoolean()
  enabled!: boolean;
}
