import { RoleSetInvitationResultNotice } from '@common/enums/role.set.invitation.result.notice';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { IApplication } from '@domain/access/application';
import { IInvitation } from '@domain/access/invitation';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RoleSetInvitationResult {
  @Field(() => RoleSetInvitationResultType, {
    nullable: false,
  })
  type!: RoleSetInvitationResultType;

  @Field(() => IInvitation, {
    nullable: true,
  })
  invitation?: IInvitation;

  @Field(() => IPlatformInvitation, {
    nullable: true,
  })
  platformInvitation?: IPlatformInvitation;

  @Field(() => IApplication, {
    nullable: true,
    description:
      'The existing open application that blocks this invitation, when the result type is ALREADY_HAS_OPEN_APPLICATION.',
  })
  application?: IApplication;

  @Field(() => RoleSetInvitationResultNotice, {
    nullable: true,
    description:
      'An informational addendum to the result, set only alongside a successful invite outcome.',
  })
  notice?: RoleSetInvitationResultNotice;
}
