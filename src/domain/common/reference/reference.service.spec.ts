import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { Reference } from './reference.entity';
import { IReference } from './reference.interface';
import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  let service: ReferenceService;
  let referenceRepository: MockType<Repository<Reference>>;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceService,
        repositoryProviderMockFactory(Reference),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ReferenceService);
    referenceRepository = module.get(getRepositoryToken(Reference));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('createReference', () => {
    it('should create a reference with name, uri, and description', () => {
      const result = service.createReference({
        name: 'Website',
        uri: 'https://example.com',
        description: 'Main site',
      });

      expect(result.name).toBe('Website');
      expect(result.uri).toBe('https://example.com');
      expect(result.authorization).toBeDefined();
    });

    it('should default uri to empty string when not provided', () => {
      const result = service.createReference({
        name: 'EmptyRef',
      });

      expect(result.uri).toBe('');
    });
  });

  describe('getReferenceOrFail', () => {
    it('should return the reference when found', async () => {
      const ref = { id: 'ref-1', name: 'test' } as Reference;
      referenceRepository.findOne!.mockResolvedValue(ref);

      const result = await service.getReferenceOrFail('ref-1');

      expect(result).toBe(ref);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      referenceRepository.findOne!.mockResolvedValue(null);

      await expect(service.getReferenceOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateReferenceValues', () => {
    it('should update uri when provided', () => {
      const reference = {
        uri: 'old',
        name: 'test',
        description: 'desc',
      } as IReference;

      service.updateReferenceValues(reference, {
        ID: 'ref-1',
        uri: 'new-uri',
      });

      expect(reference.uri).toBe('new-uri');
      expect(reference.name).toBe('test');
    });

    it('should update name when provided', () => {
      const reference = {
        uri: 'uri',
        name: 'old',
        description: 'desc',
      } as IReference;

      service.updateReferenceValues(reference, {
        ID: 'ref-1',
        name: 'new-name',
      });

      expect(reference.name).toBe('new-name');
    });

    it('should update description when provided', () => {
      const reference = {
        uri: 'uri',
        name: 'name',
        description: 'old',
      } as IReference;

      service.updateReferenceValues(reference, {
        ID: 'ref-1',
        description: 'new-desc',
      });

      expect(reference.description).toBe('new-desc');
    });

    it('should not change fields when undefined in update data', () => {
      const reference = {
        uri: 'keep',
        name: 'keep',
        description: 'keep',
      } as IReference;

      service.updateReferenceValues(reference, { ID: 'ref-1' });

      expect(reference.uri).toBe('keep');
      expect(reference.name).toBe('keep');
      expect(reference.description).toBe('keep');
    });
  });

  describe('updateReferences', () => {
    it('should throw EntityNotFoundException when references array is undefined', () => {
      expect(() =>
        service.updateReferences(undefined, [{ ID: 'ref-1', tags: [] }] as any)
      ).toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when reference ID not found in parent', () => {
      const references = [
        { id: 'ref-1', name: 'A', uri: '', description: '' },
      ] as IReference[];

      expect(() =>
        service.updateReferences(references, [
          { ID: 'non-existent', uri: 'new' },
        ])
      ).toThrow(EntityNotFoundException);
    });

    it('should update matching references by ID', () => {
      const references = [
        { id: 'ref-1', name: 'A', uri: 'old-uri', description: 'old' },
        { id: 'ref-2', name: 'B', uri: 'b-uri', description: 'b-desc' },
      ] as IReference[];

      const result = service.updateReferences(references, [
        { ID: 'ref-1', uri: 'new-uri' },
      ]);

      expect(result[0].uri).toBe('new-uri');
      expect(result[1].uri).toBe('b-uri');
    });
  });

  describe('deleteReference', () => {
    it('should delete authorization policy and remove reference', async () => {
      const reference = {
        id: 'ref-1',
        name: 'test',
        uri: 'uri',
        authorization: { id: 'auth-1' },
      } as unknown as Reference;

      referenceRepository.findOne!.mockResolvedValue(reference);
      referenceRepository.remove!.mockResolvedValue({
        name: 'test',
        uri: 'uri',
      });
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);

      const result = await service.deleteReference({ ID: 'ref-1' });

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        reference.authorization
      );
      expect(result.id).toBe('ref-1');
    });

    it('should skip authorization deletion when authorization is not set', async () => {
      const reference = {
        id: 'ref-2',
        name: 'test',
        uri: 'uri',
        authorization: undefined,
      } as unknown as Reference;

      referenceRepository.findOne!.mockResolvedValue(reference);
      referenceRepository.remove!.mockResolvedValue({
        name: 'test',
        uri: 'uri',
      });

      const result = await service.deleteReference({ ID: 'ref-2' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(result.id).toBe('ref-2');
    });
  });
});
