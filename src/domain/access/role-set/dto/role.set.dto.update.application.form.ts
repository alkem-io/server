import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateApplicationFormOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UpdateFormInput, { nullable: false })
  @ValidateNested()
  @Type(() => UpdateFormInput)
  formData!: UpdateFormInput;
}
