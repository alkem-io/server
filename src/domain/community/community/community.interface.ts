import { IApplication } from '@domain/community/application/application.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication';
import { CommunityType } from '@common/enums/community.type';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { IForm } from '@domain/common/form/form.interface';
import { IInvitation } from '../invitation/invitation.interface';
import { IInvitationExternal } from '../invitation.external/invitation.external.interface';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  groups?: IUserGroup[];

  applications?: IApplication[];
  invitations?: IInvitation[];
  externalInvitations?: IInvitationExternal[];

  applicationForm?: IForm;

  parentCommunity?: ICommunity;

  policy!: ICommunityPolicy;
  guidelines?: ICommunityGuidelines;

  spaceID!: string;

  communication?: ICommunication;
  type!: CommunityType;

  parentID!: string;
}
