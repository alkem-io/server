import { UUID } from '@domain/common/scalars';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class AdminResetUserSecondFactorInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The user whose second factor is reset.',
  })
  @IsUUID()
  userID!: string;
}

@ObjectType()
export class AdminResetUserSecondFactorResult {
  @Field(() => [String], {
    nullable: false,
    description:
      'The second-factor credential types that were removed (totp, webauthn, lookup_secret).',
  })
  removedCredentialTypes!: string[];

  @Field(() => Int, {
    nullable: false,
    description: 'How many application sessions of the user were ended.',
  })
  sessionsRevoked!: number;
}
