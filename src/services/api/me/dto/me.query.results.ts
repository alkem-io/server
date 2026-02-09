import { IApplication } from '@domain/access/application';
import { IInvitation } from '@domain/access/invitation';
import { IUser } from '@domain/community/user/user.interface';
import { ObjectType } from '@nestjs/graphql';
import { MeConversationsResult } from './me.conversations.result';
import { CommunityMembershipResult } from './me.membership.result';

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
