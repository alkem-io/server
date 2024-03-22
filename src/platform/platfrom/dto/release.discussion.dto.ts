import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LatestReleaseDiscussion')
export class ReleaseDiscussionOutput {
  @Field(() => String, {
    nullable: false,
    description: 'Id of the latest release discussion.',
  })
  id!: string;
  @Field(() => String, {
    nullable: false,
    description: 'NameID of the latest release discussion.',
  })
  nameID!: string;
}
