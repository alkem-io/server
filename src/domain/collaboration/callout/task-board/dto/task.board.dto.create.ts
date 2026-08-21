import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

/**
 * Presence of this block on a callout create flips a POSTS callout into a Tasks
 * board. Dual-registered so it round-trips through the input-creator's
 * save-as-template path (emitted as CreateCalloutTaskBoardData). When `columns`
 * is omitted the board seeds the default column set.
 */
@InputType('CreateCalloutTaskBoardInput')
@ObjectType('CreateCalloutTaskBoardData')
export class CreateCalloutTaskBoardInput {
  @Field(() => [String], {
    nullable: true,
    description:
      'The ordered columns of the Tasks board. The first is the default column. Omit to seed the default set.',
  })
  @IsOptional()
  columns?: string[];
}
