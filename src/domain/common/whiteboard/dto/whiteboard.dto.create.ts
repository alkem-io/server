import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateWhiteboardInput extends CreateNameableInput {
  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;
}
