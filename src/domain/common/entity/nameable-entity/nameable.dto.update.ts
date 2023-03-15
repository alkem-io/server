import { SMALL_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { NameID } from '@domain/common/scalars';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateNameableInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true, description: 'The display name for this entity.' })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;
}
