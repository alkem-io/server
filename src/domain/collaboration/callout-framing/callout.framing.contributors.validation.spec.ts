import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { ContributorType } from '@common/enums/contributor.type';
import { ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ICalloutSettingsFraming } from '../callout-settings/callout.settings.framing.interface';
import { CalloutFraming } from './callout.framing.entity';
import { CalloutFramingService } from './callout.framing.service';

// Covers the contributor-collection framing settings validation + auto-heal
// (FR-004b / FR-006a / FR-006b / FR-006c). Pure logic, no DB.
describe('CalloutFramingService.validateAndNormalizeContributorsSettings', () => {
  let service: CalloutFramingService;

  const framing = (
    contributors?: ICalloutSettingsFraming['contributors']
  ): ICalloutSettingsFraming => ({
    commentsEnabled: true,
    contributors,
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutFramingService,
        MockWinstonProvider,
        repositoryProviderMockFactory(CalloutFraming),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    service = module.get(CalloutFramingService);
  });

  it('rejects contributors settings on a non-CONTRIBUTORS framing (FR-004b)', () => {
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.NONE,
        framing({
          contributorTypes: [ContributorType.USER],
          defaultContributorType: ContributorType.USER,
          defaultView: ContributorCollectionView.LIST,
        })
      )
    ).toThrow(ValidationException);
  });

  it('requires contributors settings when framing is CONTRIBUTORS (FR-004b)', () => {
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.CONTRIBUTORS,
        framing(undefined)
      )
    ).toThrow(ValidationException);
  });

  it('rejects an empty contributorTypes selection (FR-006a)', () => {
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.CONTRIBUTORS,
        framing({
          contributorTypes: [],
          defaultContributorType: ContributorType.USER,
          defaultView: ContributorCollectionView.LIST,
        })
      )
    ).toThrow(ValidationException);
  });

  it('auto-heals defaultContributorType to the first selected type when unset (FR-006b)', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [ContributorType.ORGANIZATION, ContributorType.USER],
        defaultContributorType: undefined as unknown as ContributorType,
        defaultView: ContributorCollectionView.LIST,
      })
    );
    expect(result.contributors?.defaultContributorType).toBe(
      ContributorType.ORGANIZATION
    );
  });

  it('auto-heals defaultContributorType when its type was deselected (FR-006b)', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [ContributorType.USER],
        defaultContributorType: ContributorType.ORGANIZATION,
        defaultView: ContributorCollectionView.LIST,
      })
    );
    expect(result.contributors?.defaultContributorType).toBe(
      ContributorType.USER
    );
  });

  it('auto-heals defaultView to LIST when the selection becomes VC-only (FR-006c)', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [ContributorType.VIRTUAL_CONTRIBUTOR],
        defaultContributorType: ContributorType.VIRTUAL_CONTRIBUTOR,
        defaultView: ContributorCollectionView.MAP,
      })
    );
    expect(result.contributors?.defaultView).toBe(
      ContributorCollectionView.LIST
    );
  });

  it('keeps MAP when a locatable type is selected (FR-006c)', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [
          ContributorType.USER,
          ContributorType.VIRTUAL_CONTRIBUTOR,
        ],
        defaultContributorType: ContributorType.USER,
        defaultView: ContributorCollectionView.MAP,
      })
    );
    expect(result.contributors?.defaultView).toBe(
      ContributorCollectionView.MAP
    );
  });

  it('defaults an unset view to LIST', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [ContributorType.USER],
        defaultContributorType: ContributorType.USER,
        defaultView: undefined as unknown as ContributorCollectionView,
      })
    );
    expect(result.contributors?.defaultView).toBe(
      ContributorCollectionView.LIST
    );
  });
});
