import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateCanvasTemplateInput } from '@domain/template/canvas-template/dto/canvas.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCanvasTemplateOnTemplatesSetInput extends CreateCanvasTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
