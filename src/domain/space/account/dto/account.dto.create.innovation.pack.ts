import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateInnovationPackInput } from '@library/innovation-pack/dto/innovation.pack.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateInnovationPackOnAccountInput extends CreateInnovationPackInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Account where the InnovationPack is to be created.',
  })
  accountID!: string;
}
