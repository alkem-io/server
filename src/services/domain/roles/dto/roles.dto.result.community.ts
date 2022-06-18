import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResult } from './roles.dto.result';

@ObjectType()
export class RolesResultCommunity extends RolesResult {
  @Field(() => [RolesResult], {
    description:
      'Details of the Groups in the Organizations the user is a member of',
  })
  userGroups: RolesResult[];

  constructor(nameID: string, id: string, displayName: string) {
    super(nameID, id, displayName);
    this.userGroups = [];
  }
}
