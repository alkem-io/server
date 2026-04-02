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
export class MoveSpaceL1ToSpaceL0Input {
  @Field(() => UUID, {
    nullable: false,
    description: 'The L1 subspace to move to a different L0 space.',
  })
  @IsUUID()
  spaceL1ID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The target L0 space (must be different from the current parent L0).',
  })
  @IsUUID()
  targetSpaceL0ID!: string;

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
