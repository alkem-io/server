import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceLevel } from '@common/enums/space.level';
import { CommunityContributorType } from '@common/enums/community.contributor.type';

@ObjectType()
export class CommunityInvitationForRoleResult {
  @Field(() => UUID, {
    description: 'ID for the Invitation',
  })
  id: string;

  @Field(() => UUID, {
    description: 'ID for Contrbutor that is being invited to a community',
  })
  contributorID!: string;

  @Field(() => CommunityContributorType, {
    description:
      'The Type of the Contrbutor that is being invited to a community',
  })
  contributorType!: string;

  @Field(() => UUID, {
    description: 'ID for the community',
  })
  communityID: string;

  @Field(() => String, {
    description: 'Display name of the community',
  })
  displayName: string;

  @Field(() => String, {
    description: 'The current state of the invitation.',
  })
  state: string;

  @Field(() => UUID, {
    description: 'ID for the user that created the invitation.',
    nullable: false,
  })
  createdBy!: string;

  @Field(() => Date, {
    description: 'Date of creation',
  })
  createdDate: Date;

  @Field(() => Date, {
    description: 'Date of last update',
  })
  updatedDate: Date;

  @Field(() => UUID, {
    description: 'ID for the ultimate containing Space',
  })
  spaceID!: string;

  @Field(() => Number, {
    description: 'Nesting level of the Space',
  })
  spaceLevel!: SpaceLevel;

  @Field(() => UUID, {
    description: 'The welcome message of the invitation',
    nullable: true,
  })
  welcomeMessage?: string;

  constructor(
    communityID: string,
    displayName: string,
    state: string,
    id: string,
    spaceID: string,
    spaceLevel: SpaceLevel,
    createdDate: Date,
    updatedDate: Date
  ) {
    this.displayName = displayName;
    this.communityID = communityID;
    this.state = state;
    this.id = id;
    this.spaceID = spaceID;
    this.spaceLevel = spaceLevel;
    this.createdDate = createdDate;
    this.updatedDate = updatedDate;
  }
}
