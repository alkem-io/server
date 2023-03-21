import { InputType, Field } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars';

@InputType()
export class CreateNameableInput {
  @Field(() => NameID, {
    nullable: false,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}
