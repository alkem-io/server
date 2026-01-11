import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ActorQueryArgs } from '@domain/actor/actor/dto';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class UsersQueryArgs extends ActorQueryArgs {
  @Field(() => [UUID], {
    description: 'Retrieve the specified users by ID.',
    nullable: true,
  })
  IDs?: string[];
}
