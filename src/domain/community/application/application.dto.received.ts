import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ApplicationReceived')
export class ApplicationReceived {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the application',
  })
  applicationId!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The nameID of the user that applied.',
  })
  userNameID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The community that was applied to',
  })
  communityID!: string;
}
