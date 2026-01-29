import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LookupMyPrivilegesQueryResults {
  // exposed through the field resolver
  community!: AuthorizationPrivilege[];
  collaboration!: AuthorizationPrivilege[];
  context!: AuthorizationPrivilege[];
  profile!: AuthorizationPrivilege[];
  callout!: AuthorizationPrivilege[];
  post!: AuthorizationPrivilege[];
  room!: AuthorizationPrivilege[];
  innovationFlow!: AuthorizationPrivilege[];
  template!: AuthorizationPrivilege[];
  whiteboard!: AuthorizationPrivilege[];
}
