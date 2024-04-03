import { Field, ObjectType } from '@nestjs/graphql';
import { ISource } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';

@ObjectType('VirtualContributorResult')
export abstract class IVirtualContributorQueryResult {
  @Field(() => String, {
    nullable: true,
    description: 'The id of the answer; null if an error was returned',
  })
  id?: string;

  @Field(() => String, {
    nullable: false,
    description: 'The original question',
  })
  question!: string;

  @Field(() => [ISource], {
    nullable: true,
    description: 'The sources used to answer the question',
  })
  sources?: ISource[];

  @Field(() => String, {
    nullable: false,
    description: 'The answer to the question',
  })
  answer!: string;
}
