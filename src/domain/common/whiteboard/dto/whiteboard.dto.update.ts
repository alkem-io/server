import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateWhiteboardInput extends UpdateNameableInput {
  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;
}
