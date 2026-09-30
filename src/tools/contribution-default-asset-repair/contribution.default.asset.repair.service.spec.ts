import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ContributionDefaultAssetRepairService } from './contribution.default.asset.repair.service';

describe('ContributionDefaultAssetRepairService discovery', () => {
  it('uses only read ports and creates only the requested local manifest', async () => {
    const dataSource = { query: vi.fn().mockResolvedValue([]) };
    const fileService = {
      copyDocument: vi.fn(),
      deleteDocument: vi.fn(),
      getDocumentContent: vi.fn(),
      getDocumentByReference: vi.fn(),
    };
    const service = new ContributionDefaultAssetRepairService(
      dataSource as any,
      fileService as any
    );
    const manifestPath = join(
      await mkdtemp(join(tmpdir(), 'repair-discover-')),
      'manifest.json'
    );

    const execution = await service.execute({
      mode: 'discover',
      manifestPath,
    });

    expect(execution.ok).toBe(true);
    expect(execution.result).toMatchObject({ counts: {}, records: [] });
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(fileService.copyDocument).not.toHaveBeenCalled();
    expect(fileService.deleteDocument).not.toHaveBeenCalled();
  });
});
