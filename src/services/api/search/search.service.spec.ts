import { EntityNotFoundException } from '@common/exceptions';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let extractService: ReturnType<typeof createMock<SearchExtractService>>;
  let resultService: ReturnType<typeof createMock<SearchResultService>>;
  let entityManager: ReturnType<typeof createMock<EntityManager>>;

  beforeEach(() => {
    entityManager = createMock<EntityManager>();
    extractService = createMock<SearchExtractService>();
    resultService = createMock<SearchResultService>();
    const configService = createMock<ConfigService>();
    configService.get.mockReturnValue(100);

    extractService.search.mockResolvedValue([]);
    resultService.resolveSearchResults.mockResolvedValue({
      spaceResults: [],
      calloutResults: [],
    } as any);

    service = new SearchService(
      entityManager as any,
      extractService,
      resultService,
      configService as any
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search with default filters when none provided', async () => {
    const actorContext = { actorID: 'user-1' } as any;
    const searchData = {
      terms: ['test'],
      filters: [],
    } as any;

    await service.search(searchData, actorContext);

    expect(extractService.search).toHaveBeenCalled();
    expect(resultService.resolveSearchResults).toHaveBeenCalled();
    // Default filters should have been set
    expect(searchData.filters.length).toBeGreaterThan(0);
  });

  it('should pass onlyPublicResults=true when no actorID', async () => {
    const actorContext = { actorID: '' } as any;
    const searchData = {
      terms: ['test'],
      filters: [{ category: 'spaces', size: 5 }],
    } as any;

    await service.search(searchData, actorContext);

    expect(extractService.search).toHaveBeenCalledWith(searchData, true);
  });

  it('should pass onlyPublicResults=false when actorID is present', async () => {
    const actorContext = { actorID: 'user-1' } as any;
    const searchData = {
      terms: ['test'],
      filters: [{ category: 'spaces', size: 5 }],
    } as any;

    await service.search(searchData, actorContext);

    expect(extractService.search).toHaveBeenCalledWith(searchData, false);
  });

  it('should throw when searchInSpaceFilter space not found', async () => {
    entityManager.findOneByOrFail.mockRejectedValue(new Error('not found'));
    const actorContext = { actorID: 'user-1' } as any;
    const searchData = {
      terms: ['test'],
      filters: [{ category: 'spaces', size: 5 }],
      searchInSpaceFilter: 'non-existent-space',
    } as any;

    await expect(service.search(searchData, actorContext)).rejects.toThrow(
      EntityNotFoundException
    );
  });

  it('should validate space exists when searchInSpaceFilter is provided', async () => {
    entityManager.findOneByOrFail.mockResolvedValue({ id: 'space-1' } as any);
    const actorContext = { actorID: 'user-1' } as any;
    const searchData = {
      terms: ['test'],
      filters: [{ category: 'spaces', size: 5 }],
      searchInSpaceFilter: 'space-1',
    } as any;

    await service.search(searchData, actorContext);

    expect(entityManager.findOneByOrFail).toHaveBeenCalled();
    expect(extractService.search).toHaveBeenCalled();
  });
});
