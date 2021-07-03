import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { Field, InterfaceType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UUID } from '@domain/common/scalars';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@InterfaceType('Searchable', {
  resolveType(searchable) {
    if (searchable.groups) {
      return IOrganisation;
    }
    if (searchable.opportunities) {
      return IChallenge;
    }
    if (searchable.email) {
      return IUser;
    }
    if (searchable.name) {
      return IUserGroup;
    }
    throw new RelationshipNotFoundException(
      `Unable to determine search result type for ${searchable.id}`,
      LogContext.SEARCH
    );
  },
})
export abstract class ISearchable {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;
}
