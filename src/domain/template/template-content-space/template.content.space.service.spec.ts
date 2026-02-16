import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { SpaceAboutService } from '@domain/space/space.about/space.about.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { TemplateContentSpace } from './template.content.space.entity';
import { ITemplateContentSpace } from './template.content.space.interface';
import { TemplateContentSpaceService } from './template.content.space.service';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('TemplateContentSpaceService', () => {
  let service: TemplateContentSpaceService;
  let collaborationService: Mocked<CollaborationService>;
  let spaceAboutService: Mocked<SpaceAboutService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let licenseService: Mocked<LicenseService>;
  let db: any;

  beforeEach(async () => {
    // Mock static TemplateContentSpace.create to avoid DataSource requirement
    vi.spyOn(TemplateContentSpace, 'create').mockImplementation(
      (input: any) => {
        const entity = new TemplateContentSpace();
        Object.assign(entity, input);
        return entity as any;
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateContentSpaceService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateContentSpaceService);
    collaborationService = module.get(
      CollaborationService
    ) as Mocked<CollaborationService>;
    spaceAboutService = module.get(
      SpaceAboutService
    ) as Mocked<SpaceAboutService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    licenseService = module.get(LicenseService) as Mocked<LicenseService>;
    db = module.get(DRIZZLE);
  });

  describe('getTemplateContentSpaceOrFail', () => {
    it('should return the template content space when found', async () => {
      const expected = { id: 'tcs-1' } as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(expected);

      const result = await service.getTemplateContentSpaceOrFail('tcs-1');

      expect(result).toBe(expected);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(
        service.getTemplateContentSpaceOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getTemplateContentSpace', () => {
    it('should return null when not found', async () => {

      const result = await service.getTemplateContentSpace('missing');

      expect(result).toBeNull();
    });
  });

  describe('deleteTemplateContentSpaceOrFail', () => {
    it('should throw RelationshipNotFoundException when required relations are missing', async () => {
      const tcs = {
        id: 'tcs-1',
        authorization: undefined,
        about: { id: 'about-1' },
        collaboration: { id: 'collab-1' },
        subspaces: [],
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      await expect(
        service.deleteTemplateContentSpaceOrFail('tcs-1')
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should delete collaboration, about, authorization and remove the entity', async () => {
      const tcs = {
        id: 'tcs-1',
        authorization: { id: 'auth-1' },
        about: { id: 'about-1' },
        collaboration: { id: 'collab-1' },
        subspaces: [],
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      collaborationService.deleteCollaborationOrFail.mockResolvedValue(
        {} as any
      );
      spaceAboutService.removeSpaceAbout.mockResolvedValue({} as any);
      authorizationPolicyService.delete.mockResolvedValue({} as any);

      const result = await service.deleteTemplateContentSpaceOrFail('tcs-1');

      expect(
        collaborationService.deleteCollaborationOrFail
      ).toHaveBeenCalledWith('collab-1');
      expect(spaceAboutService.removeSpaceAbout).toHaveBeenCalledWith(
        'about-1'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        tcs.authorization
      );
      expect(result.id).toBe('tcs-1');
    });

    it('should recursively delete subspaces before deleting the parent', async () => {
      const subspace = {
        id: 'sub-1',
        authorization: { id: 'auth-sub' },
        about: { id: 'about-sub' },
        collaboration: { id: 'collab-sub' },
        subspaces: [],
      } as unknown as TemplateContentSpace;

      const parent = {
        id: 'parent-1',
        authorization: { id: 'auth-parent' },
        about: { id: 'about-parent' },
        collaboration: { id: 'collab-parent' },
        subspaces: [subspace],
      } as unknown as TemplateContentSpace;

      // First call returns the parent, second call returns the subspace
      db.query.templateContentSpaces.findFirst
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(subspace);

      collaborationService.deleteCollaborationOrFail.mockResolvedValue(
        {} as any
      );
      spaceAboutService.removeSpaceAbout.mockResolvedValue({} as any);
      authorizationPolicyService.delete.mockResolvedValue({} as any);

      await service.deleteTemplateContentSpaceOrFail('parent-1');

      // Collaboration should be deleted for both subspace and parent
      expect(
        collaborationService.deleteCollaborationOrFail
      ).toHaveBeenCalledWith('collab-sub');
      expect(
        collaborationService.deleteCollaborationOrFail
      ).toHaveBeenCalledWith('collab-parent');
    });
  });

  describe('update', () => {
    it('should throw EntityNotInitializedException when about is not loaded', async () => {
      const tcs = {
        id: 'tcs-1',
        about: undefined,
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      await expect(
        service.update({
          ID: 'tcs-1',
          about: { displayName: 'updated' },
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should update about when about data is provided', async () => {
      const existingAbout = { id: 'about-1', profile: {} };
      const tcs = {
        id: 'tcs-1',
        about: existingAbout,
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);
      db.returning.mockResolvedValueOnce([tcs]);

      const updatedAbout = { id: 'about-1', profile: { displayName: 'new' } };
      spaceAboutService.updateSpaceAbout.mockResolvedValue(updatedAbout as any);

      const result = await service.update({
        ID: 'tcs-1',
        about: { displayName: 'new' },
      } as any);

      expect(spaceAboutService.updateSpaceAbout).toHaveBeenCalledWith(
        existingAbout,
        { displayName: 'new' }
      );
      expect(result.about).toBe(updatedAbout);
    });

    it('should save without updating about when about data is not provided', async () => {
      const tcs = {
        id: 'tcs-1',
        about: { id: 'about-1' },
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);
      db.returning.mockResolvedValueOnce([tcs]);

      await service.update({ ID: 'tcs-1' } as any);

      expect(spaceAboutService.updateSpaceAbout).not.toHaveBeenCalled();
    });
  });

  describe('updateAboutFromExistingSpace', () => {
    it('should throw EntityNotInitializedException when about is not initialized', async () => {
      const tcs = {
        id: 'tcs-1',
        about: undefined,
      } as unknown as ITemplateContentSpace;

      await expect(
        service.updateAboutFromExistingSpace(tcs, {} as any, {} as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should remove old about and create a new one', async () => {
      const oldAbout = { id: 'old-about' };
      const tcs = {
        id: 'tcs-1',
        about: oldAbout,
      } as unknown as ITemplateContentSpace;

      const newAbout = { id: 'new-about' };
      const spaceAboutInput = { displayName: 'from space' } as any;
      const storageAggregator = {} as any;

      spaceAboutService.removeSpaceAbout.mockResolvedValue({} as any);
      spaceAboutService.createSpaceAbout.mockResolvedValue(newAbout as any);

      const result = await service.updateAboutFromExistingSpace(
        tcs,
        spaceAboutInput,
        storageAggregator
      );

      expect(spaceAboutService.removeSpaceAbout).toHaveBeenCalledWith(
        'old-about'
      );
      expect(spaceAboutService.createSpaceAbout).toHaveBeenCalledWith(
        spaceAboutInput,
        storageAggregator
      );
      expect(result.about).toBe(newAbout);
    });
  });

  describe('getSpaceAbout', () => {
    it('should return the about relation when loaded', async () => {
      const about = { id: 'about-1' };
      const tcs = { id: 'tcs-1', about } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      const result = await service.getSpaceAbout('tcs-1');

      expect(result).toBe(about);
    });

    it('should throw RelationshipNotFoundException when about is not loaded', async () => {
      const tcs = {
        id: 'tcs-1',
        about: undefined,
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      await expect(service.getSpaceAbout('tcs-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getSubspaces', () => {
    it('should return subspaces when loaded', async () => {
      const subspaces = [{ id: 'sub-1' }];
      const tcs = {
        id: 'tcs-1',
        subspaces,
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      const result = await service.getSubspaces('tcs-1');

      expect(result).toBe(subspaces);
    });

    it('should throw RelationshipNotFoundException when subspaces are not loaded', async () => {
      const tcs = {
        id: 'tcs-1',
        subspaces: undefined,
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(tcs);

      await expect(service.getSubspaces('tcs-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('createLicenseTemplateContentSpace', () => {
    it('should call licenseService.createLicense with TEMPLATE_CONTENT_SPACE type', () => {
      const mockLicense = { id: 'license-1' } as any;
      licenseService.createLicense.mockReturnValue(mockLicense);

      const result = service.createLicenseTemplateContentSpace();

      expect(result).toBe(mockLicense);
      expect(licenseService.createLicense).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'template_content_space',
          entitlements: expect.arrayContaining([
            expect.objectContaining({ type: 'space-free', enabled: false }),
            expect.objectContaining({
              type: 'space-flag-whiteboard-multi-user',
              enabled: true,
            }),
            expect.objectContaining({
              type: 'space-flag-memo-multi-user',
              enabled: true,
            }),
          ]),
        })
      );
    });
  });
});
