import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ApplicationReceived')
export class ApplicationReceived {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the application',
  })
  applicationID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The ID of the user that applied.',
  })
  userID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The community that was applied to',
  })
  communityID!: string;
}
