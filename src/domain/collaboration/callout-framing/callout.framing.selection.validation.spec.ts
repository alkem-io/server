import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ICalloutSettingsFraming } from '../callout-settings/callout.settings.framing.interface';
import { CalloutFraming } from './callout.framing.entity';
import { CalloutFramingService } from './callout.framing.service';

// Covers the selection-settings validation + normalization
// (workspace#025-callout-manual-selection, FR-013/FR-022).
// Contract: S8 (kind-scoping) + S9 (partial-update semantics).
describe('CalloutFramingService.validateAndNormalizeSelectionSettings', () => {
  let service: CalloutFramingService;

  const baseFraming = (
    selection?: ICalloutSettingsFraming['selection']
  ): ICalloutSettingsFraming => ({
    commentsEnabled: true,
    selection,
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

  // --- Kind-scoping (S8 / FR-013) ---

  it('accepts selection on a CONTRIBUTORS framing (S8)', () => {
    const framing = baseFraming();
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['id-1'] }
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
    expect(result.selection?.selectedIds).toEqual(['id-1']);
  });

  it('accepts selection on a SPACES framing (S8)', () => {
    const framing = baseFraming();
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.SPACES,
      framing,
      { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['id-2'] }
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
    expect(result.selection?.selectedIds).toEqual(['id-2']);
  });

  it('rejects selection on a NONE framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.NONE,
        baseFraming(),
        { mode: CalloutSelectionMode.CUSTOM, selectedIds: [] }
      )
    ).toThrow(ValidationException);
  });

  it('rejects selection on a WHITEBOARD framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.WHITEBOARD,
        baseFraming(),
        { mode: CalloutSelectionMode.AUTO }
      )
    ).toThrow(ValidationException);
  });

  it('rejects selection on a LINK framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.LINK,
        baseFraming(),
        { mode: CalloutSelectionMode.AUTO }
      )
    ).toThrow(ValidationException);
  });

  it('rejects selection on a MEMO framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.MEMO,
        baseFraming(),
        { mode: CalloutSelectionMode.AUTO }
      )
    ).toThrow(ValidationException);
  });

  it('rejects selection on a MEDIA_GALLERY framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.MEDIA_GALLERY,
        baseFraming(),
        { mode: CalloutSelectionMode.AUTO }
      )
    ).toThrow(ValidationException);
  });

  it('rejects selection on a POLL framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.POLL,
        baseFraming(),
        { mode: CalloutSelectionMode.AUTO }
      )
    ).toThrow(ValidationException);
  });

  it('rejects selection on a COLLABORA_DOCUMENT framing (S8 / FR-013)', () => {
    expect(() =>
      service.validateAndNormalizeSelectionSettings(
        CalloutFramingType.COLLABORA_DOCUMENT,
        baseFraming(),
        { mode: CalloutSelectionMode.AUTO }
      )
    ).toThrow(ValidationException);
  });

  // --- 013 contract: contributors still rejected on SPACES (byte-identical guard) ---

  it('does not interfere with the contributors rejection on SPACES (013 FR-004b)', () => {
    // The contributors validator (called before this one) already threw; this
    // test just confirms that validateAndNormalizeSelectionSettings accepts a
    // SPACES framing with no incoming selection and returns the default.
    const framing = baseFraming(undefined);
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.SPACES,
      framing,
      undefined
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.AUTO);
    expect(result.selection?.selectedIds).toEqual([]);
  });

  // --- Default materialization (FR-002/FR-016) ---

  it('materializes {AUTO, []} when selection is absent on a CONTRIBUTORS framing', () => {
    const framing = baseFraming(undefined);
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      undefined
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.AUTO);
    expect(result.selection?.selectedIds).toEqual([]);
  });

  it('materializes {AUTO, []} when selection is absent on a SPACES framing', () => {
    const framing = baseFraming(undefined);
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.SPACES,
      framing,
      undefined
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.AUTO);
    expect(result.selection?.selectedIds).toEqual([]);
  });

  // --- Partial-update semantics (S9 / FR-022) ---

  it('updates only mode when selectedIds is omitted (S9)', () => {
    const framing = baseFraming({
      mode: CalloutSelectionMode.AUTO,
      selectedIds: ['existing-id'],
    });
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { mode: CalloutSelectionMode.CUSTOM }
    );
    // mode changed, selectedIds kept
    expect(result.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
    expect(result.selection?.selectedIds).toEqual(['existing-id']);
  });

  it('updates only selectedIds when mode is omitted (S9)', () => {
    const framing = baseFraming({
      mode: CalloutSelectionMode.CUSTOM,
      selectedIds: ['old-id'],
    });
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { selectedIds: ['new-id-1', 'new-id-2'] }
    );
    // mode kept, selectedIds replaced
    expect(result.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
    expect(result.selection?.selectedIds).toEqual(['new-id-1', 'new-id-2']);
  });

  it('replaces selectedIds in full (not merging) when provided (S9)', () => {
    const framing = baseFraming({
      mode: CalloutSelectionMode.CUSTOM,
      selectedIds: ['a', 'b', 'c'],
    });
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { selectedIds: ['x'] }
    );
    expect(result.selection?.selectedIds).toEqual(['x']);
  });

  it('keeps stored CUSTOM mode when incomingSelection is undefined (S9 / US3 / FR-019)', () => {
    const framing = baseFraming({
      mode: CalloutSelectionMode.CUSTOM,
      selectedIds: ['a'],
    });
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      undefined // no incoming — keep stored
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
    expect(result.selection?.selectedIds).toEqual(['a']);
  });

  // --- Deduplication (FR-004 / T004) ---

  it('deduplicates selectedIds (FR-004)', () => {
    const framing = baseFraming();
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { selectedIds: ['a', 'b', 'a', 'c', 'b'] }
    );
    expect(result.selection?.selectedIds).toEqual(['a', 'b', 'c']);
  });

  // --- Non-destructive custom → auto toggle (FR-019 server side) ---

  it('switching to AUTO keeps the stored selectedIds in the framing object (FR-019)', () => {
    // The selectedIds list is preserved in storage; AUTO simply ignores it.
    const framing = baseFraming({
      mode: CalloutSelectionMode.CUSTOM,
      selectedIds: ['id-1', 'id-2'],
    });
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { mode: CalloutSelectionMode.AUTO }
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.AUTO);
    // selectedIds preserved (not cleared) — AUTO ignores them at read time
    expect(result.selection?.selectedIds).toEqual(['id-1', 'id-2']);
  });

  // --- Non-collection framing strips any stale selection ---

  it('strips stale selection on a non-collection framing type change', () => {
    const framing = baseFraming({
      mode: CalloutSelectionMode.CUSTOM,
      selectedIds: ['orphan'],
    });
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.NONE,
      framing,
      undefined // no incoming
    );
    expect(result.selection).toBeUndefined();
  });

  // --- Empty custom selection is valid (FR-003 / US3-AS4) ---

  it('accepts CUSTOM + empty selectedIds as a valid state (FR-003)', () => {
    const framing = baseFraming();
    const result = service.validateAndNormalizeSelectionSettings(
      CalloutFramingType.CONTRIBUTORS,
      framing,
      { mode: CalloutSelectionMode.CUSTOM, selectedIds: [] }
    );
    expect(result.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
    expect(result.selection?.selectedIds).toEqual([]);
  });
});
