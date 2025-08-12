import { ObjectType } from '@nestjs/graphql';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@ObjectType()
export class PlatformAdminCommunicationQueryResults {
  // exposed through the field resolver
  community!: AuthorizationPrivilege[];
  collaboration!: AuthorizationPrivilege[];
}
