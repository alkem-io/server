import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeEntry,
} from './classification.entry.test-helpers';

// S-16 / FR-014 / FR-014b: deletion is permanent, touches no template and no
// other Space's entry, and there is no soft-delete or undo.
describe('ClassificationEntryService.delete', () => {
  it('removes the row via the repository — no soft-delete flag exists to set instead', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const entry = makeEntry({ id: 'entry-to-delete' });

    const result = await service.delete(entry);

    expect(entryRepository.remove).toHaveBeenCalledWith(entry);
    expect(result.id).toEqual('entry-to-delete');
  });

  it('touches only the one entry passed in — no template lookup, no sibling entry lookup', async () => {
    const { service, entryRepository, templateRepository } =
      buildClassificationEntryService();
    const entry = makeEntry({ id: 'entry-1' });

    await service.delete(entry);

    expect(templateRepository.findOne).not.toHaveBeenCalled();
    expect(entryRepository.find).not.toHaveBeenCalled();
  });

  it('the returned entry keeps its id even though the underlying row is gone (matches the resolver return contract)', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const entry = makeEntry({ id: 'entry-1' });
    entryRepository.remove.mockResolvedValue({} as any);

    const result = await service.delete(entry);

    expect(result.id).toEqual('entry-1');
  });
});
