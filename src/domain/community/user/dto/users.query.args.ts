import { ContributorQueryArgs } from '@domain/actor/actor/dto/actor.query.args';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class UsersQueryArgs extends ContributorQueryArgs {
  @Field(() => [UUID], {
    description: 'Retrieve the specified users by ID.',
    nullable: true,
  })
  IDs?: string[];
}
