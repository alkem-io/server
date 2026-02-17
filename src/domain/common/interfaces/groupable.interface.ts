import { ICommunity } from '@domain/community/community/community.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType('Groupable', {
  resolveType(groupable) {
    if ('communicationId' in groupable || 'parentID' in groupable)
      return ICommunity;
    return IOrganization;
  },
})
export abstract class IGroupable {
  @Field(() => [IUserGroup], {
    nullable: true,
    description: 'The groups contained by this entity.',
  })
  groups?: IUserGroup[];
}
