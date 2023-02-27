import { InputType, Field } from '@nestjs/graphql';
import { IUser } from '@src/domain';

@InputType()
export class UserFilterInput implements Partial<IUser> {
  @Field(() => String, { nullable: true })
  firstName!: string;
  @Field(() => String, { nullable: true })
  lastName!: string;
  @Field(() => String, { nullable: true })
  displayName!: string;
  @Field(() => String, { nullable: true })
  email!: string;
}
