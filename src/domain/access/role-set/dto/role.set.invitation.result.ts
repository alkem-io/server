import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
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
}
