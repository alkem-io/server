import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PlatformAdminCommunicationQueryResults {
  // exposed through the field resolver
  community!: AuthorizationPrivilege[];
  collaboration!: AuthorizationPrivilege[];
}
