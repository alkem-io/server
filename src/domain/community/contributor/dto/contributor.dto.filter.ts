import { Field, InputType } from '@nestjs/graphql';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

@InputType()
export class ContributorFilterInput {
  @Field(() => [AuthorizationCredential], {
    nullable: true,
    description: 'Return contributors with credentials in the provided list',
  })
  credentials?: AuthorizationCredential[];
}
