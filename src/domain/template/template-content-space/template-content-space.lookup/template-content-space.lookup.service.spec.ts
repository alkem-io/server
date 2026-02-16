import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { type Mocked, vi } from 'vitest';
import { TemplateContentSpace } from '../template.content.space.entity';
import { TemplateContentSpaceLookupService } from './template-content-space.lookup.service';

describe('TemplateContentSpaceLookupService', () => {
  let service: TemplateContentSpaceLookupService;
  let db: any;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateContentSpaceLookupService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateContentSpaceLookupService);
    db = module.get(DRIZZLE);
  });

  describe('getTemplateContentSpaceOrFail', () => {
    it('should return the template content space when found', async () => {
      const expected = {
        id: 'tcs-1',
        level: 0,
      } as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(expected);

      const result = await service.getTemplateContentSpaceOrFail('tcs-1');

      expect(result).toBe(expected);
    });

    it('should throw EntityNotFoundException when template content space is not found', async () => {

      await expect(
        service.getTemplateContentSpaceOrFail('nonexistent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should pass additional options alongside the where clause', async () => {
      const expected = {
        id: 'tcs-1',
        about: { id: 'about-1' },
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(expected);

      await service.getTemplateContentSpaceOrFail('tcs-1', {
        relations: { about: true },
      });

    });

    it('should merge options.where with the id filter', async () => {
      const expected = { id: 'tcs-1' } as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(expected);

      await service.getTemplateContentSpaceOrFail('tcs-1', {
        where: { level: 0 } as any,
      });

    });
  });

  describe('getTemplateContentSpaceForSpaceAbout', () => {
    it('should return the template content space when found by spaceAboutID', async () => {
      const expected = {
        id: 'tcs-1',
        about: { id: 'about-1' },
      } as unknown as TemplateContentSpace;

      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce(expected);

      const result =
        await service.getTemplateContentSpaceForSpaceAbout('about-1');

      expect(result).toBe(expected);
    });

    it('should return null when no template content space is found for the spaceAboutID', async () => {

      const result =
        await service.getTemplateContentSpaceForSpaceAbout('nonexistent');

      expect(result).toBeNull();
    });

    it('should pass additional options alongside the where clause', async () => {
      db.query.templateContentSpaces.findFirst.mockResolvedValueOnce({ id: 'tcs-1' });

      await service.getTemplateContentSpaceForSpaceAbout('about-1', {
        relations: { collaboration: true },
      });

    });
  });
});
