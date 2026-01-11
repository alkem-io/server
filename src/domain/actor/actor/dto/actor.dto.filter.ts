import { Field, InputType } from '@nestjs/graphql';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

@InputType()
export class ActorFilterInput {
  @Field(() => [AuthorizationCredential], {
    nullable: true,
    description: 'Return actors with credentials in the provided list',
  })
  credentials?: AuthorizationCredential[];
}
