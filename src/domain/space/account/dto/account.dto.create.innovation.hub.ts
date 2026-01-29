import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateInnovationHubInput } from '@domain/innovation-hub/dto';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateInnovationHubOnAccountInput extends CreateInnovationHubInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Account where the InnovationHub is to be created.',
  })
  accountID!: string;
}
