import { AuthorizationCredential } from '@common/enums';
import { OrganizationRole } from '@common/enums/organization.role';
import { CommunityRoleType } from '@common/enums/community.role';
import { CommunityRoleImplicit } from '@common/enums/community.role.implicit';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

export type CredentialRole =
  | OrganizationRole
  | CommunityRoleType
  | CommunityRoleImplicit;

export type EntityCredentialType = 'spaces' | 'organizations' | 'groups';

export type CredentialMap = Map<
  EntityCredentialType,
  Map<string, CredentialRole[]>
>;

/***
 * Groups credentials by the entity category they are related to and attaches the credential type
 * returns Map of Maps in the following fashion
 * Map<'spaces', Map<'spaceUUID1', ['type1', 'type2']>>
 * - where 'spaces' is the category,
 * - 'spaceUUID1' is the identifier for a space
 * - ['type1', 'type2'] are the types of credentials associated with 'spaceUUID1'.
 * The types are represented by an array because they are guaranteed unique,
 * meaning an User (whose credentials are parsed here) can't have two credentials of type 'space-admin' for the same Space
 */
export const groupCredentialsByEntity = (
  credentials: ICredentialDefinition[]
) => {
  return credentials.reduce<CredentialMap>((map, credential) => {
    if (
      credential.type === AuthorizationCredential.SPACE_ADMIN ||
      credential.type === AuthorizationCredential.SPACE_LEAD ||
      credential.type === AuthorizationCredential.SPACE_MEMBER ||
      credential.type === AuthorizationCredential.SPACE_SUBSPACE_ADMIN
    ) {
      return setMap(map, 'spaces', credential);
    } else if (
      credential.type === AuthorizationCredential.ORGANIZATION_ADMIN ||
      credential.type === AuthorizationCredential.ORGANIZATION_OWNER ||
      credential.type === AuthorizationCredential.ORGANIZATION_ASSOCIATE
    ) {
      return setMap(map, 'organizations', credential);
    }

    return map;
  }, new Map());
};

const setMap = (
  map: CredentialMap,
  type: EntityCredentialType,
  credential: ICredentialDefinition
) => {
  const roleMap = map.get(type);
  if (roleMap) {
    roleMap.set(
      credential.resourceID,
      (roleMap.get(credential.resourceID) ?? []).concat(
        credentialTypeToRole(credential.type as AuthorizationCredential)
      )
    );
    return map.set(type, roleMap);
  }
  return map.set(
    type,
    new Map([
      [
        credential.resourceID,
        [credentialTypeToRole(credential.type as AuthorizationCredential)],
      ],
    ])
  );
};

const credentialTypeToRole = (
  type: AuthorizationCredential
): CredentialRole => {
  const roleMap: Partial<Record<AuthorizationCredential, CredentialRole>> = {
    [AuthorizationCredential.SPACE_ADMIN]: CommunityRoleType.ADMIN,
    [AuthorizationCredential.SPACE_LEAD]: CommunityRoleType.LEAD,
    [AuthorizationCredential.SPACE_MEMBER]: CommunityRoleType.MEMBER,
    [AuthorizationCredential.SPACE_SUBSPACE_ADMIN]:
      CommunityRoleImplicit.SUBSPACE_ADMIN,

    [AuthorizationCredential.ORGANIZATION_ADMIN]: OrganizationRole.ADMIN,
    [AuthorizationCredential.ORGANIZATION_ASSOCIATE]:
      OrganizationRole.ASSOCIATE,
    [AuthorizationCredential.ORGANIZATION_OWNER]: OrganizationRole.OWNER,

    [AuthorizationCredential.USER_GROUP_MEMBER]: CommunityRoleType.MEMBER, // hack for now; not used
  };

  const role = roleMap[type];

  if (!role) {
    throw Error(`Unable to convert ${type} credential to role name`);
  }

  return role;
};
