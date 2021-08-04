import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteEcoverseInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  ID!: string;
}
