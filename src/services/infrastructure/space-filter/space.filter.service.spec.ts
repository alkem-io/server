import { SpaceVisibility } from '@common/enums/space.visibility';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceFilterService } from './space.filter.service';

describe('SpaceFilterService', () => {
  let service: SpaceFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceFilterService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceFilterService);
  });

  describe('getAllowedVisibilities', () => {
    it('should return ACTIVE by default when filter is undefined', () => {
      const result = service.getAllowedVisibilities(undefined);
      expect(result).toEqual([SpaceVisibility.ACTIVE]);
    });

    it('should return ACTIVE by default when filter has no visibilities', () => {
      const result = service.getAllowedVisibilities({});
      expect(result).toEqual([SpaceVisibility.ACTIVE]);
    });

    it('should return ACTIVE by default when filter has empty visibilities array', () => {
      const result = service.getAllowedVisibilities({ visibilities: [] });
      expect(result).toEqual([SpaceVisibility.ACTIVE]);
    });

    it('should return filter visibilities when provided', () => {
      const result = service.getAllowedVisibilities({
        visibilities: [SpaceVisibility.ACTIVE, SpaceVisibility.ARCHIVED],
      });
      expect(result).toEqual([
        SpaceVisibility.ACTIVE,
        SpaceVisibility.ARCHIVED,
      ]);
    });

    it('should return single visibility from filter', () => {
      const result = service.getAllowedVisibilities({
        visibilities: [SpaceVisibility.DEMO],
      });
      expect(result).toEqual([SpaceVisibility.DEMO]);
    });

    it('should return INACTIVE visibility from filter', () => {
      const result = service.getAllowedVisibilities({
        visibilities: [SpaceVisibility.INACTIVE],
      });
      expect(result).toEqual([SpaceVisibility.INACTIVE]);
    });

    it('should return ACTIVE, DEMO and INACTIVE visibilities from filter', () => {
      const result = service.getAllowedVisibilities({
        visibilities: [
          SpaceVisibility.ACTIVE,
          SpaceVisibility.DEMO,
          SpaceVisibility.INACTIVE,
        ],
      });
      expect(result).toEqual([
        SpaceVisibility.ACTIVE,
        SpaceVisibility.DEMO,
        SpaceVisibility.INACTIVE,
      ]);
    });
  });

  describe('isVisible', () => {
    it('should return true when visibility is in the allowed list', () => {
      const result = service.isVisible(SpaceVisibility.ACTIVE, [
        SpaceVisibility.ACTIVE,
        SpaceVisibility.ARCHIVED,
      ]);
      expect(result).toBe(true);
    });

    it('should return false when visibility is not in the allowed list', () => {
      const result = service.isVisible(SpaceVisibility.DEMO, [
        SpaceVisibility.ACTIVE,
      ]);
      expect(result).toBe(false);
    });

    it('should return true when INACTIVE is in the allowed list', () => {
      const result = service.isVisible(SpaceVisibility.INACTIVE, [
        SpaceVisibility.ACTIVE,
        SpaceVisibility.INACTIVE,
      ]);
      expect(result).toBe(true);
    });

    it('should return false when INACTIVE is not in the allowed list', () => {
      const result = service.isVisible(SpaceVisibility.INACTIVE, [
        SpaceVisibility.ACTIVE,
        SpaceVisibility.DEMO,
      ]);
      expect(result).toBe(false);
    });

    it('should throw RelationshipNotFoundException when visibility is undefined', () => {
      expect(() =>
        service.isVisible(undefined, [SpaceVisibility.ACTIVE])
      ).toThrow(RelationshipNotFoundException);
    });
  });
});
