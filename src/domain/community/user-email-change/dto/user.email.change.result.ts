import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserEmailChangeResult', {
  description:
    'Result returned to the admin caller. Deliberately minimal — failures surface as typed GraphQL errors instead of returning false. Returned by both adminUserEmailChange and adminUserEmailChangeDriftResolve.',
})
export class UserEmailChangeResult {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Always true on success. Failures throw typed GraphQL errors instead of returning false.',
  })
  success!: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'The committed (canonical) email. Present on success.',
  })
  email?: string;
}
