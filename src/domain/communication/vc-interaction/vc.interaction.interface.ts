import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VcInteraction')
export abstract class IVcInteraction {
  @Field(() => String, {
    description: 'The thread ID (Matrix message ID) where VC is engaged',
  })
  threadID!: string;

  @Field(() => String, {
    description: 'The actor ID of the Virtual Contributor',
  })
  virtualContributorID!: string;
}
