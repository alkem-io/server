import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { SpaceCollectionCardVariant } from '@common/enums/space.collection.card.variant';
import { ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ICalloutSettingsFraming } from '../callout-settings/callout.settings.framing.interface';
import { CalloutFraming } from './callout.framing.entity';
import { CalloutFramingService } from './callout.framing.service';

// Covers the card-variant settings validation + normalization
// (contract graphql-spaces-card-variant, V1-V6/V8).
describe('CalloutFramingService.validateAndNormalizeSpacesSettings', () => {
  let service: CalloutFramingService;

  const baseFraming = (
    spaces?: ICalloutSettingsFraming['spaces'],
    selection?: ICalloutSettingsFraming['selection'],
    contributors?: ICalloutSettingsFraming['contributors']
  ): ICalloutSettingsFraming => ({
    commentsEnabled: true,
    spaces,
    selection,
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

  // --- V5: accepted on SPACES ---

  it('accepts spaces on a SPACES framing (V5)', () => {
    const framing = baseFraming();
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      { cardVariant: SpaceCollectionCardVariant.EXPANDED }
    );
    expect(result.spaces?.cardVariant).toBe(
      SpaceCollectionCardVariant.EXPANDED
    );
  });

  // --- V1: rejected everywhere else, including CONTRIBUTORS ---

  it.each([
    CalloutFramingType.NONE,
    CalloutFramingType.WHITEBOARD,
    CalloutFramingType.LINK,
    CalloutFramingType.MEMO,
    CalloutFramingType.MEDIA_GALLERY,
    CalloutFramingType.POLL,
    CalloutFramingType.COLLABORA_DOCUMENT,
    CalloutFramingType.CONTRIBUTORS,
  ])('rejects spaces on a %s framing (V1)', framingType => {
    expect(() =>
      service.validateAndNormalizeSpacesSettings(framingType, baseFraming(), {
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      })
    ).toThrow(ValidationException);
  });

  // --- V3: default materialization ---

  it('materializes { cardVariant: COMPACT } when nothing is stored or provided on SPACES (V3)', () => {
    const framing = baseFraming(undefined);
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      undefined
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.COMPACT,
    });
  });

  // --- V4: `spaces: {}` never yields a block without cardVariant ---

  it('incomingSpaces = {} with nothing stored materializes COMPACT, never a block without cardVariant (V4)', () => {
    const framing = baseFraming(undefined);
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      {}
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.COMPACT,
    });
  });

  it('a post-merge empty stored block ({}) with incomingSpaces undefined materializes COMPACT, never a block without cardVariant (V4)', () => {
    // Reproduces the real production input shape: both CalloutService call
    // sites merge the caller's `settings.framing.spaces` into the defaults
    // BEFORE this normalizer runs, so a caller-supplied `spaces: {}` arrives
    // here as an already-present, cardVariant-less block — not as `undefined`.
    const framing = baseFraming({} as ICalloutSettingsFraming['spaces']);
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      undefined
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.COMPACT,
    });
  });

  it('a post-merge empty stored block ({}) with incomingSpaces = {} materializes COMPACT, never a block without cardVariant (V4)', () => {
    const framing = baseFraming({} as ICalloutSettingsFraming['spaces']);
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      {}
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.COMPACT,
    });
  });

  it('incomingSpaces = {} with EXPANDED stored stays EXPANDED (V4)', () => {
    const framing = baseFraming({
      cardVariant: SpaceCollectionCardVariant.EXPANDED,
    });
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      {}
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.EXPANDED,
    });
  });

  // --- V6: incomingSpaces undefined keeps the stored value ---

  it('keeps stored EXPANDED when incomingSpaces is undefined (V6)', () => {
    const framing = baseFraming({
      cardVariant: SpaceCollectionCardVariant.EXPANDED,
    });
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      undefined
    );
    expect(result.spaces?.cardVariant).toBe(
      SpaceCollectionCardVariant.EXPANDED
    );
  });

  // --- V2: stale stored block stripped on a non-SPACES framing ---

  it('strips a stale stored block on a non-SPACES framing (V2)', () => {
    const framing = baseFraming({
      cardVariant: SpaceCollectionCardVariant.EXPANDED,
    });
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.NONE,
      framing,
      undefined
    );
    expect(result.spaces).toBeUndefined();
  });

  // --- V8: sibling settings blocks are left byte-identical ---

  it('leaves selection and contributors deep-equal before/after on the accept path (V8)', () => {
    const selection = {
      mode: CalloutSelectionMode.AUTO,
      selectedIds: ['a', 'b'],
    };
    const contributors = undefined; // SPACES never carries contributors
    const framing = baseFraming(undefined, selection, contributors);
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      { cardVariant: SpaceCollectionCardVariant.EXPANDED }
    );
    expect(result.selection).toEqual(selection);
    expect(result.contributors).toEqual(contributors);
  });

  it('leaves selection deep-equal before/after on the reject path (V8)', () => {
    const selection = { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['x'] };
    const framing = baseFraming(undefined, selection);
    expect(() =>
      service.validateAndNormalizeSpacesSettings(
        CalloutFramingType.CONTRIBUTORS,
        framing,
        { cardVariant: SpaceCollectionCardVariant.EXPANDED }
      )
    ).toThrow(ValidationException);
    expect(framing.selection).toEqual(selection);
  });

  it('leaves selection deep-equal before/after on the strip path (V8)', () => {
    const selection = { mode: CalloutSelectionMode.AUTO, selectedIds: [] };
    const framing = baseFraming(
      { cardVariant: SpaceCollectionCardVariant.EXPANDED },
      selection
    );
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.NONE,
      framing,
      undefined
    );
    expect(result.selection).toEqual(selection);
  });

  // --- security:server:sec-server-2: an explicit `null` is "not provided",
  // never a value to persist — matches the `!= null` convention documented
  // in innovation.flow.state.service.ts for the same non-nullable-field hazard.

  it('create with cardVariant: null on a SPACES framing persists COMPACT, never null (sec-server-2)', () => {
    const framing = baseFraming();
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      { cardVariant: null }
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.COMPACT,
    });
  });

  it('update with cardVariant: null on a callout stored as EXPANDED leaves EXPANDED unchanged (sec-server-2)', () => {
    const framing = baseFraming({
      cardVariant: SpaceCollectionCardVariant.EXPANDED,
    });
    const result = service.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      framing,
      { cardVariant: null }
    );
    expect(result.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.EXPANDED,
    });
  });

  it('update with spaces: null on a non-SPACES callout does not throw (sec-server-2)', () => {
    const framing = baseFraming();
    expect(() =>
      service.validateAndNormalizeSpacesSettings(
        CalloutFramingType.NONE,
        framing,
        null
      )
    ).not.toThrow();
    expect(framing.spaces).toBeUndefined();
  });
});
