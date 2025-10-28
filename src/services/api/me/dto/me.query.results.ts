import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { IInvitation } from '@domain/access/invitation';
import { IApplication } from '@domain/access/application';
import { CommunityMembershipResult } from './me.membership.result';
import { MeConversationsResult } from './me.conversations.result';

@ObjectType()
export class MeQueryResults {
  // exposed through the field resolver
  user!: IUser;
  invitations!: IInvitation[];
  applications!: IApplication[];
  spaceMembershipsHierarchical!: CommunityMembershipResult[];
  spaceMembershipsFlat!: CommunityMembershipResult[];
  conversations!: MeConversationsResult;
}
