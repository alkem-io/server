import { UUID_LENGTH } from '@common/constants';
import { CreateNVPInput } from '@domain/common/nvp';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class ApplyForEntryRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateNVPInput)
  questions!: CreateNVPInput[];
}
