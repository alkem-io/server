import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ContributorRolePolicy')
export abstract class IContributorRolePolicy {
  @Field(() => Boolean, {
    description: 'Is this role enabled for this Contributor',
  })
  enabled!: boolean;

  @Field(() => Number, {
    description: 'Minimum number of Contributors in this role',
  })
  minimum!: number;

  @Field(() => Number, {
    description: 'Maximum number of Contributors in this role',
  })
  maximum!: number;
}
