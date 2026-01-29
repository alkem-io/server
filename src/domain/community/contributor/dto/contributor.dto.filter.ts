import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ContributorFilterInput {
  @Field(() => [AuthorizationCredential], {
    nullable: true,
    description: 'Return contributors with credentials in the provided list',
  })
  credentials?: AuthorizationCredential[];
}
