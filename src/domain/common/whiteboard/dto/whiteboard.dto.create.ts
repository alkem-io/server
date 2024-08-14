import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CreateNameableOptionalInput } from '@domain/common/entity/nameable-entity/dto/nameable.optional.dto.create';

@InputType()
export class CreateWhiteboardInput extends CreateNameableOptionalInput {
  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;
}
