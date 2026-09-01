import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { ArrayMaxSize, IsOptional, MaxLength } from 'class-validator';
import { MAX_TASK_BOARD_COLUMNS } from '../task.board.constants';

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
  @ArrayMaxSize(MAX_TASK_BOARD_COLUMNS)
  @MaxLength(SMALL_TEXT_LENGTH, { each: true })
  columns?: string[];
}
