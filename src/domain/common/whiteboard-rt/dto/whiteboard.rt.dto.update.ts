import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateWhiteboardRtInput extends UpdateNameableInput {
  @Field(() => WhiteboardContent, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  @IsOptional()
  content?: string;

  @Field(() => ContentUpdatePolicy, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  contentUpdatePolicy?: ContentUpdatePolicy;
}
