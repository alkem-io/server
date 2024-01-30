import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '../scalars';

@ArgsType()
export class IDsQueryArgs {
  @Field(() => [UUID], {
    description: 'The IDs of the entities to return',
    nullable: true,
  })
  IDs?: string[];
}
