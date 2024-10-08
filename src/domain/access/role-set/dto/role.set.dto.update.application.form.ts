import { InputType, Field } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { UUID } from '@domain/common/scalars';

@InputType()
export class UpdateApplicationFormOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UpdateFormInput, { nullable: false })
  @ValidateNested()
  @Type(() => UpdateFormInput)
  formData!: UpdateFormInput;
}
