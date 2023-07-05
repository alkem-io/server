import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InvitationForRoleResult {
  @Field(() => UUID, {
    description: 'ID for the application',
  })
  id: string;

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

  @Field(() => UUID, {
    description:
      'ID for the Challenge being invited to, if any. Or the Challenge containing the Opportunity being invited to.',
    nullable: true,
  })
  challengeID?: string;

  @Field(() => UUID, {
    description: 'ID for the Opportunity being invited to, if any.',
    nullable: true,
  })
  opportunityID?: string;
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
    createdDate: Date,
    updatedDate: Date
  ) {
    this.displayName = displayName;
    this.communityID = communityID;
    this.state = state;
    this.id = id;
    this.spaceID = spaceID;
    this.createdDate = createdDate;
    this.updatedDate = updatedDate;
  }
}
