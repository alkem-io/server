import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSpaceSettingsCollaborationInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to control if members can create subspaces.',
  })
  allowMembersToCreateSubspaces!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to control if members can create callouts.',
  })
  allowMembersToCreateCallouts!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to control if ability to contribute is inherited from parent Space.',
  })
  inheritMembershipRights!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to control if events from Subspaces are visible on this Space calendar as well.',
  })
  allowEventsFromSubspaces!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to control if members can create video calls in this Space.',
  })
  allowMembersToVideoCall!: boolean;
}
