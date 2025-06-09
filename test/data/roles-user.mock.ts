import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';

interface IRolesUserSubspace {
  displayName: string;
  nameID: string;
  id: string;
  roles: RoleName[];
  level: SpaceLevel;
}

interface IRolesUserSpace {
  displayName: string;
  nameID: string;
  id: string;
  roles: RoleName[];
  subspaces: IRolesUserSubspace[];
}

interface IRolesUserOrganization {
  displayName: string;
  nameID: string;
  id: string;
  userGroups: any[];
  roles: RoleName[];
  organizationID: string;
}

interface IRolesUserApplication {
  displayName: string;
  communityID: string;
  state: string;
  id: string;
  spaceID: string;
}

export interface IRolesUserData {
  space: IRolesUserSpace;
  organizations: IRolesUserOrganization[];
  applications: IRolesUserApplication[];
  communities: any[];
}

export const rolesUserData: { rolesUser: IRolesUserData } = {
  rolesUser: {
    space: {
      displayName: 'UN Sustainable Development Goals',
      nameID: 'un-sdgs',
      id: '00655835-4d15-4546-801e-1ab80ac3078a',
      roles: [RoleName.MEMBER],
      subspaces: [
        {
          displayName:
            'Food security and nutrition and sustainable agriculture',
          nameID: 'food-sec',
          id: 'd3c76102-087b-4b40-8aa5-b5e6023784d0',
          roles: [RoleName.MEMBER, RoleName.LEAD],
          level: SpaceLevel.L1,
        },
        {
          displayName: 'Rural Development',
          nameID: 'rural',
          id: 'ed5b344e-72d1-4256-a385-f3b6e4aaaabf',
          roles: [RoleName.MEMBER],
          level: SpaceLevel.L1,
        },
      ],
    },
    organizations: [
      {
        displayName: 'SDGS – water',
        nameID: 'water',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/65755d1d-c0fb-4efa-b4f7-7ad3f2466adb',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: '65755d1d-c0fb-4efa-b4f7-7ad3f2466adb',
      },
      {
        displayName: 'SDGS – energy',
        nameID: 'energy',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/82a9d004-847e-453e-9e1b-f36f3f53a4c6',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: '82a9d004-847e-453e-9e1b-f36f3f53a4c6',
      },
      {
        displayName: 'UnitedNations',
        nameID: 'united-nations',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/03bb5b07-f134-4074-97b9-1dd7950c7fa4',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: '03bb5b07-f134-4074-97b9-1dd7950c7fa4',
      },
      {
        displayName: 'World Bank',
        nameID: 'world-bank',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/d965c8e6-d194-432d-9f0a-68e58cbe9fb5',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: 'd965c8e6-d194-432d-9f0a-68e58cbe9fb5',
      },
      {
        displayName: 'FAO of Unated Nations',
        nameID: 'faq',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/e8171dcf-118a-46a3-940d-3416a7dd9264',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: 'e8171dcf-118a-46a3-940d-3416a7dd9264',
      },
      {
        displayName: 'SDGS – food',
        nameID: 'food',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/9b042a97-0c72-4b30-b4eb-e6f50fe071bc',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: '9b042a97-0c72-4b30-b4eb-e6f50fe071bc',
      },
      {
        displayName: 'SDGS – climate',
        nameID: 'climate',
        id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e/f1f63669-4a36-4eeb-af33-1403ffcf13b7',
        userGroups: [],
        roles: [RoleName.ASSOCIATE],
        organizationID: 'f1f63669-4a36-4eeb-af33-1403ffcf13b7',
      },
    ],
    applications: [
      {
        displayName: 'Default Space',
        communityID: '22160282-7dab-45ab-9a83-039e05fcf5a4',
        state: 'new',
        id: '18084faf-c950-4faf-baa8-15d74a5f715e',
        spaceID: 'bde93e37-4581-4b27-a6d9-07f12b33847c',
      },
    ],
    communities: [],
  },
};
