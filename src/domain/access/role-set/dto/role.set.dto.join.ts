import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';

@InputType()
export class JoinAsBaseRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;
}
