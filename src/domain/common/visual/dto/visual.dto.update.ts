import { ALT_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateVisualInput {
  @Field({ nullable: false })
  visualID!: string;

  @Field({ nullable: false })
  uri!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(ALT_TEXT_LENGTH)
  alternativeText?: string;

  @Field(() => Number, {
    nullable: true,
    description:
      'The width / height ratio to display this visual at. Must fall within the visual type’s minAspectRatio - maxAspectRatio range; types with a fixed shape accept only their single allowed value.',
  })
  @IsOptional()
  aspectRatio?: number;
}
