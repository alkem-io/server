import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateVisualInput {
  @Field({ nullable: false })
  visualID!: string;
  @Field({ nullable: false })
  uri!: string;
}
