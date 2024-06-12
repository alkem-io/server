import { MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateInvitationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the contributor being invited.',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  invitedContributor!: string;

  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of  contributor being invited.',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  contributorType!: CommunityContributorType;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  communityID!: string;
  invitedToParent!: boolean;
}
