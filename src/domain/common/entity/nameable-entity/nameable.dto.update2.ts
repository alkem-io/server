import { InputType, Field } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateNameable2Input extends UpdateBaseAlkemioInput {
  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;
}
