import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceAbout')
export abstract class ISpaceAbout extends IAuthorizable {
  // exposed through a field resolver
  profile!: IProfile;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  why?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  who?: string;

  guidelines?: ICommunityGuidelines;
}
