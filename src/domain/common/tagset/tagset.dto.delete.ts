import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteTagsetInput {
  @Field({ nullable: false })
  ID!: number;
}
