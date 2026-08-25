import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateCalloutContributionDefaultsInput {
  @Field({
    nullable: true,
    description: 'The default title to use for new contributions.',
  })
  @IsOptional()
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  defaultDisplayName?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new Post contributions.',
  })
  postDescription?: string;

  /** Server-internal canonical content used while cloning persisted callouts. */
  whiteboardContent?: string;

  /** Server-internal ownership constraint paired with `whiteboardContent`. */
  sourceStorageBucketID?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Replace the default from an existing Whiteboard. The server copies its content and media into the owning Callout bucket; the source id is not persisted.',
  })
  @IsOptional()
  sourceWhiteboardID?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Copy the internal Whiteboard contribution default from this source Callout. Mutually exclusive with sourceWhiteboardID and clearWhiteboardContent.',
  })
  @IsOptional()
  sourceCalloutID?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Remove the stored Whiteboard contribution default. Mutually exclusive with sourceWhiteboardID and sourceCalloutID.',
  })
  @IsOptional()
  @IsBoolean()
  clearWhiteboardContent?: boolean;
}
