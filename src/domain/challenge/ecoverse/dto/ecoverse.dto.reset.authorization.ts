import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class EcoverseAuthorizationResetInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The identifier of the Ecoverse whose AuthorizationDefinition should be reset.',
  })
  ecoverseID!: string;
}
