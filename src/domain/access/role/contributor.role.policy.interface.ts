import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ContributorRolePolicy')
export abstract class IContributorRolePolicy {
  @Field(() => Number, {
    description: 'Minimum number of Contributors in this role',
  })
  minimum!: number;

  @Field(() => Number, {
    description: 'Maximum number of Contributors in this role',
  })
  maximum!: number;
}
