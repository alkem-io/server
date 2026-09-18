import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MemoSigningContinueResult {
  @Field(() => String)
  authorizeUrl!: string;
}
