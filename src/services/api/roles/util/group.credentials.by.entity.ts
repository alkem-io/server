import { ICredential } from '@src/domain';
import { AuthorizationCredential } from '@common/enums';
import { CommunityRole } from '@common/enums/community.role';

export type EntityCredentialType =
  | 'hubs'
  | 'challenges'
  | 'opportunities'
  | 'organizations'
  | 'groups';

export type CredentialMap = Map<
  EntityCredentialType,
  Map<string, CommunityRole[]>
>;

/***
 * Groups credentials by the entity category they are related to and attaches the credential type
 * returns Map of Maps in the following fashion
 * Map<'hubs', Map<'hubUUID1', ['type1', 'type2']>>
 * - where 'hubs' is the category,
 * - 'hubUUID1' is the identifier for a hub
 * - ['type1', 'type2'] are the types of credentials associated with 'hubUUID1'.
 * The types are represented by an array because they are guaranteed unique,
 * meaning an User (whose credentials are parsed here) can't have two credentials of type 'hub-admin' for the same Hub
 */
export const groupCredentialsByEntity = (credentials: ICredential[]) => {
  return credentials.reduce<CredentialMap>((map, credential) => {
    if (
      credential.type === AuthorizationCredential.HUB_ADMIN ||
      credential.type === AuthorizationCredential.HUB_HOST ||
      credential.type === AuthorizationCredential.HUB_MEMBER
    ) {
      return setMap(map, 'hubs', credential);
    } else if (
      credential.type === AuthorizationCredential.CHALLENGE_ADMIN ||
      credential.type === AuthorizationCredential.CHALLENGE_LEAD ||
      credential.type === AuthorizationCredential.CHALLENGE_MEMBER
    ) {
      return setMap(map, 'challenges', credential);
    } else if (
      credential.type === AuthorizationCredential.OPPORTUNITY_ADMIN ||
      credential.type === AuthorizationCredential.OPPORTUNITY_LEAD ||
      credential.type === AuthorizationCredential.OPPORTUNITY_MEMBER
    ) {
      return setMap(map, 'opportunities', credential);
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
  credential: ICredential
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

const credentialTypeToRole = (type: AuthorizationCredential): CommunityRole => {
  const roleMap = {
    [AuthorizationCredential.HUB_ADMIN]: CommunityRole.ADMIN,
    [AuthorizationCredential.CHALLENGE_ADMIN]: CommunityRole.ADMIN,
    [AuthorizationCredential.OPPORTUNITY_ADMIN]: CommunityRole.ADMIN,
    [AuthorizationCredential.ORGANIZATION_ADMIN]: CommunityRole.ADMIN,

    [AuthorizationCredential.HUB_HOST]: CommunityRole.HOST,

    [AuthorizationCredential.CHALLENGE_LEAD]: CommunityRole.LEAD,
    [AuthorizationCredential.OPPORTUNITY_LEAD]: CommunityRole.LEAD,

    [AuthorizationCredential.HUB_MEMBER]: CommunityRole.MEMBER,
    [AuthorizationCredential.CHALLENGE_MEMBER]: CommunityRole.MEMBER,
    [AuthorizationCredential.OPPORTUNITY_MEMBER]: CommunityRole.MEMBER,

    [AuthorizationCredential.ORGANIZATION_ASSOCIATE]: CommunityRole.ASSOCIATE,
    [AuthorizationCredential.ORGANIZATION_OWNER]: CommunityRole.OWNER,

    [AuthorizationCredential.USER_GROUP_MEMBER]: CommunityRole.MEMBER,

    [AuthorizationCredential.GLOBAL_ADMIN]: undefined,
    [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY]: undefined,
    [AuthorizationCredential.GLOBAL_ADMIN_HUBS]: undefined,
    [AuthorizationCredential.GLOBAL_REGISTERED]: undefined,
    [AuthorizationCredential.USER_SELF_MANAGEMENT]: undefined,
    [AuthorizationCredential.INNOVATION_PACK_PROVIDER]: undefined,
  } as const;

  const role = roleMap[type];

  if (!role) {
    throw Error(`Unable to convert ${type} credential to role name`);
  }

  return role;
};
