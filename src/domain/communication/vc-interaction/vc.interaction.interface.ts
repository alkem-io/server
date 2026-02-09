import { MessageID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VcInteraction')
export abstract class IVcInteraction {
  @Field(() => MessageID, {
    description: 'The thread ID (Matrix message ID) where VC is engaged',
  })
  threadID!: string;

  @Field(() => String, {
    description: 'The actor ID (agent.id) of the Virtual Contributor',
  })
  virtualContributorID!: string;
}
