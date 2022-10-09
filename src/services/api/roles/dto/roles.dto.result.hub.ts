import { IHub } from '@domain/challenge/hub/hub.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResultCommunity } from './roles.dto.result.community';

@ObjectType()
export class RolesResultHub extends RolesResultCommunity {
  @Field(() => String, {
    description: 'The Hub ID',
  })
  hubID: string;

  hub: IHub;

  @Field(() => [RolesResultCommunity], {
    description: 'Details of the Challenges the user is a member of',
  })
  challenges: RolesResultCommunity[] = [];

  @Field(() => [RolesResultCommunity], {
    description: 'Details of the Opportunities the Contributor is a member of',
  })
  opportunities: RolesResultCommunity[] = [];

  constructor(hub: IHub) {
    super(hub.nameID, hub.id, hub.displayName);
    this.hubID = hub.id;
    this.hub = hub;
  }
}
