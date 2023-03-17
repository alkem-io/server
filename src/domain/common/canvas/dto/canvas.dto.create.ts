import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create.old';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCanvasInput extends CreateNameableInputOld {
  value?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description:
      'A readable identifier, unique within the containing scope. If not provided it will be generated based on the displayName.',
  })
  nameID!: string;
}
