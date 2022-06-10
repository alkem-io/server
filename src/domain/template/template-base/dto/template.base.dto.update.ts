import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { UpdateTemplateInfoInput } from '@domain/template/template-info/dto/template.base.dto.update';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateTemplateBaseInput extends UpdateBaseAlkemioInput {
  @Field({
    nullable: true,
    description: 'The meta information for this Template.',
  })
  templateInfo!: UpdateTemplateInfoInput;
}
