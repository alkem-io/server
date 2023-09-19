import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@InputType()
export class CreateWhiteboardOnCalloutInput extends CreateWhiteboardInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;

  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;
}
