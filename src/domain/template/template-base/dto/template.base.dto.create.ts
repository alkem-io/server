import { CreateTemplateInfoInput } from '@domain/template/template-info/dto';
import { InputType, Field } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
@InputType()
export class CreateTemplateBaseInput {
  @Field({
    nullable: false,
    description: 'The meta information for this Template.',
  })
  @ValidateNested()
  @Type(() => CreateTemplateInfoInput)
  info!: CreateTemplateInfoInput;
}
