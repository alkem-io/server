import { IHub } from '@domain/challenge/hub/hub.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResult as RolesResult } from './roles.dto.result';

@ObjectType()
export class RolesResultHub extends RolesResult {
  @Field(() => String, {
    description: 'The Hub ID',
  })
  hubID: string;

  hub: IHub;

  @Field(() => [RolesResult], {
    description: 'Details of the Challenges the user is a member of',
  })
  challenges: RolesResult[] = [];

  @Field(() => [RolesResult], {
    description: 'Details of the Opportunities the Contributor is a member of',
  })
  opportunities: RolesResult[] = [];

  constructor(hub: IHub) {
    super(hub.nameID, hub.id, hub.displayName);
    this.hubID = hub.id;
    this.hub = hub;
  }
}
