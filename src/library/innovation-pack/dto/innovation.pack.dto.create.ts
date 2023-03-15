import { Field, InputType } from '@nestjs/graphql';
import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create.old';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class CreateInnovationPackInput extends CreateNameableInputOld {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The provider Organization for the InnovationPack',
  })
  providerID!: string;
}
