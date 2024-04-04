import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { VirtualPersonaType } from '@services/adapters/virtual-persona-adapter/virtual.persona.type';

@InputType()
export class CreateVirtualContributorInput extends CreateContributorInput {
  @Field(() => String, { nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;

  @Field(() => VirtualPersonaType, {
    description: 'VirtualContributor Persona  type.',
  })
  type!: VirtualPersonaType;
}
