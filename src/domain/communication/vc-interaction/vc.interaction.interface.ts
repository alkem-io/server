import { Field, ObjectType } from '@nestjs/graphql';
import { MessageID } from '@domain/common/scalars';

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
