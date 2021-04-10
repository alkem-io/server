import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteTagsetInput {
  @Field()
  ID!: number;
}
