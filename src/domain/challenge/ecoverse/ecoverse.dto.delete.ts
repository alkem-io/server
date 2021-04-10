import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteEcoverseInput {
  @Field()
  ID!: number;
}
