import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
} from '@common/exceptions';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { UserGroup } from '.';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';

describe('UserGroupService', () => {
  let service: UserGroupService;
  let repository: {
    findOne: Mock;
    save: Mock;
    remove: Mock;
    find: Mock;
  };
  let profileService: {
    createProfile: Mock;
    updateProfile: Mock;
    deleteProfile: Mock;
  };
  let authorizationPolicyService: { delete: Mock };
  let userLookupService: {
    getUserByIdOrFail: Mock;
    usersWithCredential: Mock;
  };
  let actorService: {
    grantCredentialOrFail: Mock;
    revokeCredential: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
        repositoryProviderMockFactory(UserGroup),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<UserGroupService>(UserGroupService);
    repository = module.get(getRepositoryToken(UserGroup));
    profileService = module.get(ProfileService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    userLookupService = module.get(UserLookupService) as any;
    actorService = module.get(ActorService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserGroupOrFail', () => {
    it('should return group when found', async () => {
      const group = { id: 'group-1' } as IUserGroup;
      repository.findOne.mockResolvedValue(group);
      const result = await service.getUserGroupOrFail('group-1');
      expect(result).toBe(group);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.getUserGroupOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass options to findOne', async () => {
      const group = { id: 'group-1' } as IUserGroup;
      repository.findOne.mockResolvedValue(group);
      const options = { relations: { profile: true } };
      await service.getUserGroupOrFail('group-1', options as any);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'group-1' }),
          relations: { profile: true },
        })
      );
    });
  });

  describe('updateUserGroup', () => {
    it('should throw EntityNotFoundException when profile not initialized', async () => {
      const group = { id: 'group-1', profile: undefined };
      repository.findOne.mockResolvedValue(group);

      await expect(
        service.updateUserGroup({ ID: 'group-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should update displayName when new name provided', async () => {
      const group = {
        id: 'group-1',
        profile: { displayName: 'Old Name' },
      } as unknown as IUserGroup;
      repository.findOne.mockResolvedValue(group);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateUserGroup({
        ID: 'group-1',
        name: 'New Name',
      } as any);
      expect(group.profile!.displayName).toBe('New Name');
    });

    it('should not update displayName when name is same', async () => {
      const group = {
        id: 'group-1',
        profile: { displayName: 'Same Name' },
      } as unknown as IUserGroup;
      repository.findOne.mockResolvedValue(group);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateUserGroup({
        ID: 'group-1',
        name: 'Same Name',
      } as any);
      expect(group.profile!.displayName).toBe('Same Name');
    });

    it('should update profile when profileData provided', async () => {
      const group = {
        id: 'group-1',
        profile: { displayName: 'Name' },
      } as unknown as IUserGroup;
      const updatedProfile = { displayName: 'Updated' };
      repository.findOne.mockResolvedValue(group);
      profileService.updateProfile.mockResolvedValue(updatedProfile);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateUserGroup({
        ID: 'group-1',
        profileData: { description: 'Updated desc' },
      } as any);
      expect(profileService.updateProfile).toHaveBeenCalled();
    });
  });

  describe('saveUserGroup', () => {
    it('should delegate to repository save', async () => {
      const group = { id: 'group-1' } as IUserGroup;
      repository.save.mockResolvedValue(group);
      const result = await service.saveUserGroup(group);
      expect(result).toBe(group);
    });
  });

  describe('getParent', () => {
    it('should return community when group belongs to community', async () => {
      const community = { id: 'comm-1' };
      const group = {
        id: 'group-1',
        community,
        organization: undefined,
      };
      repository.findOne.mockResolvedValue(group);

      const result = await service.getParent({ id: 'group-1' } as IUserGroup);
      expect(result).toBe(community);
    });

    it('should return organization when group belongs to organization', async () => {
      const organization = { id: 'org-1' };
      const group = {
        id: 'group-1',
        community: undefined,
        organization,
      };
      repository.findOne.mockResolvedValue(group);

      const result = await service.getParent({ id: 'group-1' } as IUserGroup);
      expect(result).toBe(organization);
    });

    it('should throw EntityNotFoundException when no parent found', async () => {
      const group = {
        id: 'group-1',
        community: undefined,
        organization: undefined,
      };
      repository.findOne.mockResolvedValue(group);

      await expect(
        service.getParent({ id: 'group-1' } as IUserGroup)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('addGroupWithName', () => {
    it('should throw NotSupportedException when group with name already exists', async () => {
      const groupable = {
        id: 'parent-1',
        groups: [{ profile: { displayName: 'Existing' } }],
      };

      await expect(
        service.addGroupWithName(groupable as any, 'Existing', {} as any)
      ).rejects.toThrow(NotSupportedException);
    });

    it('should throw EntityNotInitializedException when groups not initialized', async () => {
      const groupable = { id: 'parent-1', groups: undefined };

      await expect(
        service.addGroupWithName(groupable as any, 'New', {} as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should create and add group when name is unique', async () => {
      const groupable = { id: 'parent-1', groups: [] as any[] };
      // createUserGroup is called internally, which uses UserGroup.create() that needs a DataSource.
      // Instead we spy on createUserGroup to avoid the static call.
      const newGroup = { id: 'new-group', profile: { displayName: 'New' } };
      vi.spyOn(service, 'createUserGroup').mockResolvedValue(newGroup as any);

      const result = await service.addGroupWithName(
        groupable as any,
        'New',
        {} as any
      );
      expect(result).toBe(newGroup);
      expect(groupable.groups).toContain(newGroup);
    });
  });

  describe('assignUser', () => {
    it('should grant credential and return group', async () => {
      const user = { id: 'user-1' };
      const group = { id: 'group-1' };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      actorService.grantCredentialOrFail.mockResolvedValue(undefined);
      repository.findOne.mockResolvedValue(group);

      const result = await service.assignUser({
        userID: 'user-1',
        groupID: 'group-1',
      });
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: expect.any(String),
          resourceID: 'group-1',
        })
      );
      expect(result).toBe(group);
    });
  });

  describe('removeUser', () => {
    it('should revoke credential and return group', async () => {
      const user = { id: 'user-1' };
      const group = { id: 'group-1' };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      actorService.revokeCredential.mockResolvedValue(undefined);
      repository.findOne.mockResolvedValue(group);

      const result = await service.removeUser({
        userID: 'user-1',
        groupID: 'group-1',
      });
      expect(actorService.revokeCredential).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: expect.any(String),
          resourceID: 'group-1',
        })
      );
      expect(result).toBe(group);
    });
  });

  describe('getMembers', () => {
    it('should delegate to userLookupService', async () => {
      const members = [{ id: 'user-1' }];
      userLookupService.usersWithCredential.mockResolvedValue(members);

      const result = await service.getMembers('group-1');
      expect(result).toBe(members);
      expect(userLookupService.usersWithCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceID: 'group-1',
        })
      );
    });
  });

  describe('getGroups', () => {
    it('should return groups from repository', async () => {
      const groups = [{ id: 'g1' }];
      repository.find.mockResolvedValue(groups);
      const result = await service.getGroups();
      expect(result).toBe(groups);
    });

    it('should return empty array when no groups found', async () => {
      repository.find.mockResolvedValue([]);
      const result = await service.getGroups();
      expect(result).toEqual([]);
    });
  });

  describe('getProfile', () => {
    it('should return profile when initialized', () => {
      const profile = { id: 'profile-1', displayName: 'Group' };
      const group = { id: 'group-1', profile } as unknown as IUserGroup;
      const result = service.getProfile(group);
      expect(result).toBe(profile);
    });

    it('should throw EntityNotInitializedException when profile missing', () => {
      const group = {
        id: 'group-1',
        profile: undefined,
      } as unknown as IUserGroup;
      expect(() => service.getProfile(group)).toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('removeUserGroup', () => {
    it('should delete profile, authorization, remove members and group', async () => {
      const group = {
        id: 'group-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      };
      repository.findOne.mockResolvedValue(group);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      userLookupService.usersWithCredential.mockResolvedValue([]);
      repository.remove.mockResolvedValue({ ...group, id: undefined });

      const result = await service.removeUserGroup({ ID: 'group-1' });
      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalled();
      expect(result.id).toBe('group-1');
    });

    it('should remove membership credentials for all members', async () => {
      const group = {
        id: 'group-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      };
      const members = [{ id: 'user-1' }, { id: 'user-2' }];
      repository.findOne.mockResolvedValue(group);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      userLookupService.usersWithCredential.mockResolvedValue(members);
      userLookupService.getUserByIdOrFail.mockImplementation((id: string) =>
        Promise.resolve({ id })
      );
      actorService.revokeCredential.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue({ ...group, id: undefined });

      await service.removeUserGroup({ ID: 'group-1' });
      // revokeCredential should be called for each member
      expect(actorService.revokeCredential).toHaveBeenCalledTimes(2);
    });
  });
});
