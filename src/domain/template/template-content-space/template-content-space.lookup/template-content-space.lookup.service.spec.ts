import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { TemplateContentSpace } from '../template.content.space.entity';
import { TemplateContentSpaceLookupService } from './template-content-space.lookup.service';

describe('TemplateContentSpaceLookupService', () => {
  let service: TemplateContentSpaceLookupService;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateContentSpaceLookupService,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateContentSpaceLookupService);
    entityManager = module.get(
      getEntityManagerToken('default')
    ) as Mocked<EntityManager>;
  });

  describe('getTemplateContentSpaceOrFail', () => {
    it('should return the template content space when found', async () => {
      const expected = {
        id: 'tcs-1',
        level: 0,
      } as TemplateContentSpace;

      entityManager.findOne.mockResolvedValue(expected);

      const result = await service.getTemplateContentSpaceOrFail('tcs-1');

      expect(result).toBe(expected);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        TemplateContentSpace,
        expect.objectContaining({
          where: { id: 'tcs-1' },
        })
      );
    });

    it('should throw EntityNotFoundException when template content space is not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getTemplateContentSpaceOrFail('nonexistent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should pass additional options alongside the where clause', async () => {
      const expected = {
        id: 'tcs-1',
        about: { id: 'about-1' },
      } as unknown as TemplateContentSpace;

      entityManager.findOne.mockResolvedValue(expected);

      await service.getTemplateContentSpaceOrFail('tcs-1', {
        relations: { about: true },
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(
        TemplateContentSpace,
        expect.objectContaining({
          relations: { about: true },
          where: { id: 'tcs-1' },
        })
      );
    });

    it('should merge options.where with the id filter', async () => {
      const expected = { id: 'tcs-1' } as TemplateContentSpace;
      entityManager.findOne.mockResolvedValue(expected);

      await service.getTemplateContentSpaceOrFail('tcs-1', {
        where: { level: 0 } as any,
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(
        TemplateContentSpace,
        expect.objectContaining({
          where: expect.objectContaining({ level: 0, id: 'tcs-1' }),
        })
      );
    });
  });

  describe('getTemplateContentSpaceForSpaceAbout', () => {
    it('should return the template content space when found by spaceAboutID', async () => {
      const expected = {
        id: 'tcs-1',
        about: { id: 'about-1' },
      } as unknown as TemplateContentSpace;

      entityManager.findOne.mockResolvedValue(expected);

      const result =
        await service.getTemplateContentSpaceForSpaceAbout('about-1');

      expect(result).toBe(expected);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        TemplateContentSpace,
        expect.objectContaining({
          where: expect.objectContaining({
            about: { id: 'about-1' },
          }),
        })
      );
    });

    it('should return null when no template content space is found for the spaceAboutID', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result =
        await service.getTemplateContentSpaceForSpaceAbout('nonexistent');

      expect(result).toBeNull();
    });

    it('should pass additional options alongside the where clause', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await service.getTemplateContentSpaceForSpaceAbout('about-1', {
        relations: { collaboration: true },
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(
        TemplateContentSpace,
        expect.objectContaining({
          relations: { collaboration: true },
          where: expect.objectContaining({
            about: { id: 'about-1' },
          }),
        })
      );
    });
  });
});
