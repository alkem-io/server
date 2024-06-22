import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceSettingsCollaboration')
export abstract class ISpaceSettingsCollaboration {
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
}
