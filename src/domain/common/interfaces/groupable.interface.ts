import { IOrganisation } from '@domain/community/organisation';
import { IUserGroup, UserGroup } from '@domain/community/user-group';
import { Field, InterfaceType } from '@nestjs/graphql';
import { ICommunity } from '@domain/community/community';

@InterfaceType('Groupable', {
  resolveType(groupable) {
    if (groupable.textID) {
      return IOrganisation;
    }
    return ICommunity;
  },
})
export abstract class IGroupable {
  @Field(() => [IUserGroup], {
    nullable: true,
    description: 'The groups contained by this entity.',
  })
  groups?: UserGroup[];
}
