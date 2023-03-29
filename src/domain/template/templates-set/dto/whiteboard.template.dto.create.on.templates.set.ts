import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateWhiteboardTemplateInput } from '@domain/template/whiteboard-template/dto/whiteboard.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateWhiteboardTemplateOnTemplatesSetInput extends CreateWhiteboardTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
