import { IHub } from '@domain/challenge/hub/hub.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { HubVisibility } from '@common/enums/hub.visibility';
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

  @Field(() => HubVisibility, {
    nullable: false,
    description: 'Visibility of the Hub.',
  })
  visibility!: HubVisibility;

  constructor(hub: IHub) {
    super(hub.nameID, hub.id, hub.profile?.displayName || '');
    this.hubID = hub.id;
    this.hub = hub;
    this.visibility = hub.visibility ?? HubVisibility.ACTIVE;
  }
}
