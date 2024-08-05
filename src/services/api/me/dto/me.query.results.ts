import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { IInvitation } from '@domain/community/invitation';
import { IApplication } from '@domain/community/application';
import { CommunityMembershipResult } from './me.membership.result';

@ObjectType()
export class MeQueryResults {
  // exposed through the field resolver
  user!: IUser;
  invitations!: IInvitation[];
  applications!: IApplication[];
  spaceMembershipsHierarchical!: CommunityMembershipResult[];
  spaceMembershipsFlat!: CommunityMembershipResult[];
}
