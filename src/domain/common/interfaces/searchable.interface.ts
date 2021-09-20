import { IOrganization } from '@domain/community/organization/organization.interface';
import { Field, InterfaceType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UUID } from '@domain/common/scalars';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';

@InterfaceType('Searchable', {
  resolveType(searchable) {
    if (searchable.groups) {
      return IOrganization;
    }
    if (searchable.opportunities) {
      return IChallenge;
    }
    if (searchable.projects) {
      return IOpportunity;
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
