import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateInnovationPackInput extends CreateNameableInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The provider Organization for the InnovationPack',
  })
  providerID!: string;
}
