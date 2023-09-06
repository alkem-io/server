import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateWhiteboardTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;
}
