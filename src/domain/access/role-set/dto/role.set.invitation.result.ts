import { RoleSetInvitationResultNotice } from '@common/enums/role.set.invitation.result.notice';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { IApplication } from '@domain/access/application';
import { IInvitation } from '@domain/access/invitation';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { UUID } from '@domain/common/scalars';
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

  // Identity of the invitee this result belongs to. Typed failures create
  // neither an invitation nor a platformInvitation, so without these the
  // client had to fall back to matching results positionally — which
  // mis-attributes as soon as an invited email turns out to be an existing
  // user, because the server moves that invitee from the email group into
  // the actor group and the result order stops matching the input order.
  @Field(() => UUID, {
    nullable: true,
    description:
      'The id of the invited actor this result belongs to, when the invitee was an actor or an email that resolved to an existing user.',
  })
  invitedActorID?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The email address this result belongs to, when the invitee was submitted as an email address.',
  })
  invitedEmail?: string;

  @Field(() => RoleSetInvitationResultNotice, {
    nullable: true,
    description:
      'An informational addendum to the result, set only alongside a successful invite outcome.',
  })
  notice?: RoleSetInvitationResultNotice;
}
