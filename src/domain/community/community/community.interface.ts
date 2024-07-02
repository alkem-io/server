import { IApplication } from '@domain/community/application/application.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { IForm } from '@domain/common/form/form.interface';
import { IInvitation } from '../invitation/invitation.interface';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IPlatformInvitation } from '@platform/invitation';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  groups?: IUserGroup[];

  applications?: IApplication[];
  invitations?: IInvitation[];
  platformInvitations?: IPlatformInvitation[];

  applicationForm?: IForm;

  parentCommunity?: ICommunity;

  policy!: ICommunityPolicy;
  guidelines?: ICommunityGuidelines;

  communication?: ICommunication;

  parentID!: string;
}
