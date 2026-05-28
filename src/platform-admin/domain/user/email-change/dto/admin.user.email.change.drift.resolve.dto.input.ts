import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsUUID } from 'class-validator';

@InputType()
export class AdminUserEmailChangeDriftResolveInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The subject user whose latest audit entry is drift_detected.',
  })
  @IsUUID()
  userID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The admin-chosen canonical email. MUST equal either the old or new email recorded on the drift_detected audit entry. Both sides are force-aligned to this value.',
  })
  @IsEmail()
  canonicalEmail!: string;
}
