import { ActorType } from '@common/enums/actor.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ICalloutContributorsMapView } from '../callout-settings/callout.settings.contributors.mapview.interface';
import { ICalloutSettingsFraming } from '../callout-settings/callout.settings.framing.interface';
import { CalloutFraming } from './callout.framing.entity';
import { CalloutFramingService } from './callout.framing.service';

/**
 * Validation matrix + isolation specs for the mapView field on
 * ICalloutContributorsSettings.
 *
 * Covers the accept/reject matrix and mutual isolation of the mapView clause.
 *
 * Isolation: the mapView normalizer clause MUST NOT touch
 * contributorTypes/defaultContributorType/defaultView, and the
 * contributor-type healing rules MUST NOT touch mapView. Both directions are
 * proven by the isolation tests below.
 */
describe('CalloutFramingService.validateAndNormalizeContributorsSettings — mapView', () => {
  let service: CalloutFramingService;

  /** Valid base contributors settings (no mapView). */
  const baseContributors = () => ({
    contributorTypes: [ActorType.USER],
    defaultContributorType: ActorType.USER,
    defaultView: ContributorCollectionView.LIST,
  });

  const framing = (
    contributors?: ICalloutSettingsFraming['contributors']
  ): ICalloutSettingsFraming => ({
    commentsEnabled: true,
    contributors,
  });

  const validMapView = (): ICalloutContributorsMapView => ({
    longitude: 4.9,
    latitude: 52.37,
    zoom: 7,
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

  // ─── absent mapView ────────────────────────────────────────────────────────

  it('absent mapView: normalizer passes and result has no mapView field', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({ ...baseContributors() })
    );
    expect(result.contributors?.mapView).toBeUndefined();
  });

  // ─── valid mapView round-trips ─────────────────────────────────────────────

  it('valid mapView round-trips verbatim', () => {
    const mv = validMapView();
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({ ...baseContributors(), mapView: mv })
    );
    expect(result.contributors?.mapView).toEqual(mv);
  });

  // ─── range and finiteness rejection ────────────────────────────────────────

  const poisonCases: Array<[string, Partial<ICalloutContributorsMapView>]> = [
    ['NaN longitude', { longitude: NaN, latitude: 52.37, zoom: 7 }],
    ['NaN latitude', { longitude: 4.9, latitude: NaN, zoom: 7 }],
    ['NaN zoom', { longitude: 4.9, latitude: 52.37, zoom: NaN }],
    ['+Infinity longitude', { longitude: Infinity, latitude: 52.37, zoom: 7 }],
    ['-Infinity latitude', { longitude: 4.9, latitude: -Infinity, zoom: 7 }],
    ['+Infinity zoom', { longitude: 4.9, latitude: 52.37, zoom: Infinity }],
    [
      'latitude 90.1 (MapLibre crash bound)',
      { longitude: 4.9, latitude: 90.1, zoom: 7 },
    ],
    ['latitude -90.1', { longitude: 4.9, latitude: -90.1, zoom: 7 }],
    ['longitude 180.1', { longitude: 180.1, latitude: 52.37, zoom: 7 }],
    ['longitude -180.1', { longitude: -180.1, latitude: 52.37, zoom: 7 }],
    ['zoom -0.1', { longitude: 4.9, latitude: 52.37, zoom: -0.1 }],
    ['zoom 22.1', { longitude: 4.9, latitude: 52.37, zoom: 22.1 }],
  ];

  it.each(poisonCases)('rejects poison coordinate: %s', (_label, partial) => {
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.CONTRIBUTORS,
        framing({
          ...baseContributors(),
          mapView: partial as ICalloutContributorsMapView,
        })
      )
    ).toThrow(ValidationException);
  });

  // Boundary values ACCEPTED (not rejected)
  it('accepts boundary value: latitude +90', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: { longitude: 0, latitude: 90, zoom: 10 },
      })
    );
    expect(result.contributors?.mapView?.latitude).toBe(90);
  });

  it('accepts boundary value: latitude -90', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: { longitude: 0, latitude: -90, zoom: 10 },
      })
    );
    expect(result.contributors?.mapView?.latitude).toBe(-90);
  });

  it('accepts boundary value: longitude +180', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: { longitude: 180, latitude: 0, zoom: 10 },
      })
    );
    expect(result.contributors?.mapView?.longitude).toBe(180);
  });

  it('accepts boundary value: longitude -180', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: { longitude: -180, latitude: 0, zoom: 10 },
      })
    );
    expect(result.contributors?.mapView?.longitude).toBe(-180);
  });

  it('accepts boundary value: zoom 0', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: { longitude: 0, latitude: 0, zoom: 0 },
      })
    );
    expect(result.contributors?.mapView?.zoom).toBe(0);
  });

  it('accepts boundary value: zoom 22', () => {
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: { longitude: 0, latitude: 0, zoom: 22 },
      })
    );
    expect(result.contributors?.mapView?.zoom).toBe(22);
  });

  // ─── malformed/partial stored shape ──────────────────────────────────────

  it('rejects a stored mapView with a missing field (partial object)', () => {
    // A direct DB edit or non-GraphQL construction path could produce a partial
    // object; the normalizer rejects it.
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.CONTRIBUTORS,
        framing({
          ...baseContributors(),
          mapView: { longitude: 4.9, latitude: 52.37 } as any,
        })
      )
    ).toThrow(ValidationException);
  });

  it('rejects a stored mapView with a string field (wrong type)', () => {
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.CONTRIBUTORS,
        framing({
          ...baseContributors(),
          mapView: { longitude: '4.9', latitude: 52.37, zoom: 7 } as any,
        })
      )
    ).toThrow(ValidationException);
  });

  // ─── explicit null clears, omitted preserves ─────────────────────────────

  it('explicit null mapView is treated as cleared (passes validation)', () => {
    // Explicit null is the "clear to automatic" signal; normalizer must not
    // reject it — null is not an invalid value, it is the absent sentinel.
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        ...baseContributors(),
        mapView: null as unknown as ICalloutContributorsMapView,
      })
    );
    // null propagates through (the JSONB will store null which reads as
    // absent/automatic from the client's perspective).
    expect(result.contributors?.mapView).toBeNull();
  });

  // ─── mutual isolation ────────────────────────────────────────────────────

  it('mapView-only update leaves contributorTypes/defaultContributorType/defaultView untouched', () => {
    // Simulates: stored state has all three fields set; incoming update adds mapView only.
    const stored = {
      contributorTypes: [ActorType.USER, ActorType.ORGANIZATION],
      defaultContributorType: ActorType.ORGANIZATION,
      defaultView: ContributorCollectionView.MAP,
      mapView: undefined,
    };
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({ ...stored, mapView: validMapView() })
    );
    expect(result.contributors?.contributorTypes).toEqual([
      ActorType.USER,
      ActorType.ORGANIZATION,
    ]);
    expect(result.contributors?.defaultContributorType).toBe(
      ActorType.ORGANIZATION
    );
    expect(result.contributors?.defaultView).toBe(
      ContributorCollectionView.MAP
    );
    expect(result.contributors?.mapView).toEqual(validMapView());
  });

  it('contributor-type healing leaves mapView untouched', () => {
    // Simulates: incoming update deselects ORGANIZATION (healing should fix
    // defaultContributorType to USER) but mapView must not be altered.
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [ActorType.USER], // removed ORGANIZATION
        defaultContributorType: ActorType.ORGANIZATION, // stale — will be healed
        defaultView: ContributorCollectionView.LIST,
        mapView: validMapView(),
      })
    );
    // Healing fixed the stale defaultContributorType:
    expect(result.contributors?.defaultContributorType).toBe(ActorType.USER);
    // mapView is untouched by the healing clause:
    expect(result.contributors?.mapView).toEqual(validMapView());
  });

  it('defaultView VC-only healing leaves mapView untouched', () => {
    const mv = { longitude: 10, latitude: 51, zoom: 5 };
    const result = service.validateAndNormalizeContributorsSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing({
        contributorTypes: [ActorType.VIRTUAL_CONTRIBUTOR],
        defaultContributorType: ActorType.VIRTUAL_CONTRIBUTOR,
        defaultView: ContributorCollectionView.MAP, // will be healed to LIST (VC-only)
        mapView: mv,
      })
    );
    expect(result.contributors?.defaultView).toBe(
      ContributorCollectionView.LIST
    );
    expect(result.contributors?.mapView).toEqual(mv);
  });

  // ─── kind scoping (inherited gate, regression pin) ──────────────────────

  it('contributors settings incl. mapView on a non-CONTRIBUTORS framing is rejected', () => {
    // The existing CONTRIBUTORS-kind gate rejects any contributors payload on
    // a non-CONTRIBUTORS framing — mapView does not bypass it.
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.SPACES,
        framing({
          ...baseContributors(),
          mapView: validMapView(),
        })
      )
    ).toThrow(ValidationException);
  });

  it('contributors settings incl. mapView on a NONE framing is rejected', () => {
    expect(() =>
      service.validateAndNormalizeContributorsSettings(
        CalloutFramingType.NONE,
        framing({
          ...baseContributors(),
          mapView: validMapView(),
        })
      )
    ).toThrow(ValidationException);
  });
});
