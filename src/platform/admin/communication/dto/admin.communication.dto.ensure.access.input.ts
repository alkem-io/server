import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminEnsureAccessInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;
}
