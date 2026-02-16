import { TagsetType } from '@common/enums/tagset.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { TagsetNotFoundException } from '@common/exceptions/tagset.not.found.exception';
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
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { CreateTagsetInput } from './dto/tagset.dto.create';
import { Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';
import { TagsetService } from './tagset.service';

describe('TagsetService', () => {
  let service: TagsetService;
  let tagsetRepository: MockType<Repository<Tagset>>;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    // Mock static Tagset.create to avoid DataSource requirement
    vi.spyOn(Tagset, 'create').mockImplementation((input: any) => {
      const entity = new Tagset();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsetService,
        repositoryProviderMockFactory(Tagset),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TagsetService);
    tagsetRepository = module.get(getRepositoryToken(Tagset));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('createTagset', () => {
    it('should create a tagset with authorization policy and default type FREEFORM', () => {
      const result = service.createTagset({
        name: 'test-tagset',
        tags: ['a', 'b'],
      });

      expect(result.name).toBe('test-tagset');
      expect(result.type).toBe(TagsetType.FREEFORM);
      expect(result.tags).toEqual(['a', 'b']);
      expect(result.authorization).toBeDefined();
    });

    it('should use provided type instead of default FREEFORM', () => {
      const result = service.createTagset({
        name: 'select-tagset',
        type: TagsetType.SELECT_ONE,
        tags: [],
      });

      expect(result.type).toBe(TagsetType.SELECT_ONE);
    });

    it('should default tags to empty array when not provided', () => {
      const result = service.createTagset({ name: 'empty' });

      expect(result.tags).toEqual([]);
    });
  });

  describe('getTagsetOrFail', () => {
    it('should return tagset when found', async () => {
      const tagset = { id: 'ts-1', name: 'test' } as Tagset;
      tagsetRepository.findOne!.mockResolvedValue(tagset);

      const result = await service.getTagsetOrFail('ts-1');

      expect(result).toBe(tagset);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      tagsetRepository.findOne!.mockResolvedValue(null);

      await expect(service.getTagsetOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeTagset', () => {
    it('should delete authorization and remove tagset', async () => {
      const tagset = {
        id: 'ts-1',
        authorization: { id: 'auth-1' },
      } as unknown as Tagset;
      tagsetRepository.findOne!.mockResolvedValue(tagset);
      tagsetRepository.remove!.mockResolvedValue({ name: 'test' });
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);

      const result = await service.removeTagset('ts-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        tagset.authorization
      );
      expect(result.id).toBe('ts-1');
    });

    it('should skip authorization deletion when authorization is undefined', async () => {
      const tagset = {
        id: 'ts-1',
        authorization: undefined,
      } as unknown as Tagset;
      tagsetRepository.findOne!.mockResolvedValue(tagset);
      tagsetRepository.remove!.mockResolvedValue({});

      await service.removeTagset('ts-1');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('validateForAllowedValues', () => {
    it('should not throw when all tags are in allowed values', () => {
      expect(() =>
        service.validateForAllowedValues(['a', 'b'], ['a', 'b', 'c'])
      ).not.toThrow();
    });

    it('should throw ValidationException when tags contain disallowed values', () => {
      expect(() =>
        service.validateForAllowedValues(['a', 'x'], ['a', 'b', 'c'])
      ).toThrow(ValidationException);
    });
  });

  describe('updateTagsetValues', () => {
    it('should update name when provided', () => {
      const tagset = { name: 'old', tags: ['a'] } as ITagset;

      service.updateTagsetValues(tagset, { ID: 'ts-1', name: 'new', tags: [] });

      expect(tagset.name).toBe('new');
    });

    it('should update tags when provided', () => {
      const tagset = { name: 'test', tags: ['old'] } as ITagset;

      service.updateTagsetValues(tagset, {
        ID: 'ts-1',
        tags: ['new1', 'new2'],
      });

      expect(tagset.tags).toEqual(['new1', 'new2']);
    });

    it('should not modify tagset when no data provided', () => {
      const tagset = { name: 'keep', tags: ['keep'] } as ITagset;

      service.updateTagsetValues(tagset, { ID: 'ts-1', tags: [] });

      expect(tagset.name).toBe('keep');
    });
  });

  describe('updateTagsets', () => {
    it('should throw EntityNotFoundException when tagsets is undefined', () => {
      expect(() =>
        service.updateTagsets(undefined, [{ ID: 'ts-1', tags: ['a'] }])
      ).toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when tagset ID not found', () => {
      const tagsets = [
        { id: 'ts-1', name: 'A', tags: [] },
      ] as unknown as ITagset[];

      expect(() =>
        service.updateTagsets(tagsets, [{ ID: 'non-existent', tags: ['new'] }])
      ).toThrow(EntityNotFoundException);
    });

    it('should update matching tagsets by ID', () => {
      const tagsets = [
        { id: 'ts-1', name: 'A', tags: ['old'] },
        { id: 'ts-2', name: 'B', tags: ['b'] },
      ] as ITagset[];

      const result = service.updateTagsets(tagsets, [
        { ID: 'ts-1', tags: ['updated'] },
      ]);

      expect(result[0].tags).toEqual(['updated']);
      expect(result[1].tags).toEqual(['b']);
    });
  });

  describe('hasTagsetWithName', () => {
    it('should return true when tagset with name exists', () => {
      const tagsets = [{ name: 'skills' }, { name: 'keywords' }] as ITagset[];

      expect(service.hasTagsetWithName(tagsets, 'skills')).toBe(true);
    });

    it('should return false when tagset with name does not exist', () => {
      const tagsets = [{ name: 'skills' }] as ITagset[];

      expect(service.hasTagsetWithName(tagsets, 'missing')).toBe(false);
    });
  });

  describe('getTagsetByName', () => {
    it('should return the tagset matching the given name', () => {
      const tagsets = [
        { name: 'skills', tags: ['ts'] },
        { name: 'keywords', tags: ['kw'] },
      ] as ITagset[];

      const result = service.getTagsetByName(tagsets, 'skills');

      expect(result?.name).toBe('skills');
    });

    it('should return undefined when no tagset matches', () => {
      const tagsets = [{ name: 'skills' }] as ITagset[];

      expect(service.getTagsetByName(tagsets, 'missing')).toBeUndefined();
    });

    it('should throw TagsetNotFoundException when name is empty string', () => {
      const tagsets = [{ name: 'skills' }] as ITagset[];

      expect(() => service.getTagsetByName(tagsets, '')).toThrow(
        TagsetNotFoundException
      );
    });
  });

  describe('getTagsetByNameOrFail', () => {
    it('should return tagset when found', () => {
      const tagsets = [{ name: 'skills', tags: ['ts'] }] as ITagset[];

      const result = service.getTagsetByNameOrFail(tagsets, 'skills');

      expect(result.name).toBe('skills');
    });

    it('should throw TagsetNotFoundException when not found', () => {
      const tagsets = [{ name: 'skills' }] as ITagset[];

      expect(() => service.getTagsetByNameOrFail(tagsets, 'missing')).toThrow(
        TagsetNotFoundException
      );
    });
  });

  describe('createTagsetWithName', () => {
    it('should throw ValidationException when tagset with same name already exists', () => {
      const existing = [{ name: 'skills' }] as ITagset[];

      expect(() =>
        service.createTagsetWithName(existing, { name: 'skills' })
      ).toThrow(ValidationException);
    });

    it('should create tagset when name is unique', () => {
      const existing = [{ name: 'skills' }] as ITagset[];

      const result = service.createTagsetWithName(existing, {
        name: 'keywords',
        tags: ['new'],
      });

      expect(result.name).toBe('keywords');
    });
  });

  describe('updateTagsetInputs', () => {
    it('should return additional inputs when tagsetInputData is undefined', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'default', tags: [], type: TagsetType.FREEFORM },
      ];

      const result = service.updateTagsetInputs(undefined, additional);

      expect(result).toEqual(additional);
    });

    it('should merge tags from tagsetInputData into matching additional inputs', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'skills', tags: [], type: TagsetType.FREEFORM },
      ];
      const tagsetInputData: CreateTagsetInput[] = [
        { name: 'skills', tags: ['typescript'], type: TagsetType.FREEFORM },
      ];

      const result = service.updateTagsetInputs(tagsetInputData, additional);

      expect(result[0].tags).toEqual(['typescript']);
    });

    it('should add non-matching tagset inputs to result', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'skills', tags: [], type: TagsetType.FREEFORM },
      ];
      const tagsetInputData: CreateTagsetInput[] = [
        { name: 'extra', tags: ['val'], type: TagsetType.FREEFORM },
      ];

      const result = service.updateTagsetInputs(tagsetInputData, additional);

      expect(result).toHaveLength(2);
      expect(result[1].name).toBe('extra');
    });
  });

  describe('convertTagsetTemplatesToCreateTagsetInput', () => {
    it('should convert templates to create tagset inputs', () => {
      const templates = [
        {
          name: 'skills',
          type: TagsetType.SELECT_MANY,
          allowedValues: ['ts', 'js'],
          defaultSelectedValue: 'ts',
        },
      ] as unknown as ITagsetTemplate[];

      const result =
        service.convertTagsetTemplatesToCreateTagsetInput(templates);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('skills');
      expect(result[0].type).toBe(TagsetType.SELECT_MANY);
      expect(result[0].tags).toEqual(['ts']);
      expect(result[0].tagsetTemplate).toBe(templates[0]);
    });

    it('should set tags to undefined when no defaultSelectedValue', () => {
      const templates = [
        {
          name: 'keywords',
          type: TagsetType.FREEFORM,
          allowedValues: [],
          defaultSelectedValue: undefined,
        },
      ] as unknown as ITagsetTemplate[];

      const result =
        service.convertTagsetTemplatesToCreateTagsetInput(templates);

      expect(result[0].tags).toBeUndefined();
    });
  });

  describe('updatedTagsetInputUsingProvidedData', () => {
    it('should return base data unchanged when no additional inputs provided', () => {
      const base: CreateTagsetInput[] = [
        { name: 'skills', tags: ['a'], type: TagsetType.FREEFORM },
      ];

      const result = service.updatedTagsetInputUsingProvidedData(base);

      expect(result).toEqual(base);
    });

    it('should override tags in base data with matching additional input tags', () => {
      const base: CreateTagsetInput[] = [
        { name: 'skills', tags: ['a'], type: TagsetType.FREEFORM },
      ];
      const additional: CreateTagsetInput[] = [
        { name: 'skills', tags: ['b', 'c'], type: TagsetType.FREEFORM },
      ];

      const result = service.updatedTagsetInputUsingProvidedData(
        base,
        additional
      );

      expect(result[0].tags).toEqual(['b', 'c']);
    });

    it('should not add additional inputs that have no match in base', () => {
      const base: CreateTagsetInput[] = [
        { name: 'skills', tags: ['a'], type: TagsetType.FREEFORM },
      ];
      const additional: CreateTagsetInput[] = [
        { name: 'unknown', tags: ['x'], type: TagsetType.FREEFORM },
      ];

      const result = service.updatedTagsetInputUsingProvidedData(
        base,
        additional
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('skills');
    });
  });
});
