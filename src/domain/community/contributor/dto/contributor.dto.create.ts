import { Field, InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';

@InputType()
export class CreateContributorInput extends CreateNameableInput {
  // Override to allow contributors to have a nameID generated that is unique
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}
