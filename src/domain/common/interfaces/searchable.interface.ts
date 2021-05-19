import { IOrganisation } from '@domain/community/organisation';
import { Field, ID, InterfaceType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user';
import { IUserGroup } from '@domain/community/user-group';

@InterfaceType('Searchable', {
  resolveType(searchable) {
    if (searchable.textID) {
      return IOrganisation;
    }
    if (searchable.name) {
      return IUser;
    }
    return IUserGroup;
  },
})
export abstract class ISearchable {
  @Field(() => ID, {
    nullable: false,
    description: 'The ID of the entity that was found.',
  })
  id!: number;
}
