import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { IProfile } from '@domain/common/profile/profile.interface';

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
}
