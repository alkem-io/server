import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class MoveSpaceL1ToSpaceL2Input {
  @Field(() => UUID, {
    nullable: false,
    description: 'The L1 subspace to move and demote to L2.',
  })
  @IsUUID()
  spaceL1ID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The target L1 subspace in a different L0 (new parent for the demoted space).',
  })
  @IsUUID()
  targetSpaceL1ID!: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description:
      'Send invitations to former community members who are also in the target L0 community.',
  })
  @IsOptional()
  @IsBoolean()
  autoInvite?: boolean;

  @Field(() => String, {
    nullable: true,
    description:
      'Custom invitation message. Used only when autoInvite is true.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  invitationMessage?: string;
}
