import { SMALL_TEXT_LENGTH } from '@common/constants';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateWhiteboardInput extends UpdateNameableInput {
  @Field(() => ContentUpdatePolicy, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  contentUpdatePolicy?: ContentUpdatePolicy;
}
