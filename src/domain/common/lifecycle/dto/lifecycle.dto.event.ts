import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILifecycle } from '../lifecycle.interface';

@InputType()
export class LifecycleEventInput {
  @Field({
    nullable: false,
    description: 'The ID of the entity to which the event is sent',
  })
  ID!: string;

  @Field({
    nullable: false,
    description:
      'The name of the event. Simple text and matching an event in the Lifecycle definition.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;

  agentInfo!: AgentInfo;
  authorization?: IAuthorizationPolicy;
  parentID!: string;

  lifecycle!: ILifecycle;

  machine!: any;
}
