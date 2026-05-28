import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ContributorFilterInput {
  @Field(() => String, { nullable: true })
  displayName?: string;

  @Field(() => String, { nullable: true })
  nameID?: string;
}
