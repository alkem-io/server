import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UpdateCanvasTemplateInput } from '@domain/template/canvas-template/dto/canvas.template.dto.update';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCanvasTemplateOnTemplatesSetInput extends UpdateCanvasTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
