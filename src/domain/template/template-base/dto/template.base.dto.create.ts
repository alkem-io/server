import { CreateTemplateInfoInput } from '@domain/template/template-info/dto';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateTemplateBaseInput {
  @Field({
    nullable: false,
    description: 'The meta information for this Template.',
  })
  templateInfo!: CreateTemplateInfoInput;
}
