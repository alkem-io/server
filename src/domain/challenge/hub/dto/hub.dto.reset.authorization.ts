import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class HubAuthorizationResetInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The identifier of the Hub whose Authorization Policy should be reset.',
  })
  hubID!: string;
}
