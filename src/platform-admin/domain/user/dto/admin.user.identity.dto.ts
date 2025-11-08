import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@ObjectType('AdminUserIdentity')
export class AdminUserIdentityDto {
  @Field(() => UUID, {
    description: 'Unique identifier of the user.',
  })
  userId!: string;

  @Field(() => String, {
    description: 'Primary email associated with the user account.',
  })
  email!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Kratos identity identifier linked to the user.',
  })
  authId!: string | null;

  @Field(() => String, {
    description: 'Account UPN maintained for administrative lookup.',
  })
  accountUpn!: string;

  @Field(() => String, {
    description: 'First name recorded on the user profile.',
  })
  firstName!: string;

  @Field(() => String, {
    description: 'Last name recorded on the user profile.',
  })
  lastName!: string;
}
