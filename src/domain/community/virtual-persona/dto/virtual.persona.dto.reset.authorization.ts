import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VirtualPersonaAuthorizationResetInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description:
      'The identifier of the Virtual Persona whose Authorization Policy should be reset.',
  })
  virtualPersonaID!: string;
}
