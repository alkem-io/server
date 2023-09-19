import { UUID } from '@domain/common/scalars/scalar.uuid';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class CreateWhiteboardTemplateInput extends CreateTemplateBaseInput {
  // Todo: validate that it is actually JSON? This also applies to our Whiteboard entity usage.
  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Use the specified Whiteboard as the initial value for this WhiteboardTemplate',
  })
  @IsOptional()
  whiteboardID?: string;
}
