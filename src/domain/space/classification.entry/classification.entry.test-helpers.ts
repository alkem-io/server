// Shared test-only construction helpers for ClassificationEntryService specs.
// Not itself a spec file (excluded by the `*.spec.ts` glob), so it carries no
// tests of its own — only fixtures reused across the S-1…S-22 spec suite.
import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { TemplateType } from '@common/enums/template.type';
import { vi } from 'vitest';
import { ClassificationEntry } from './classification.entry.entity';
import { ClassificationEntryService } from './classification.entry.service';

export function createMockClassificationEntryRepository() {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getRawOne: vi.fn().mockResolvedValue({ max: null }),
  };
  const repository: any = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    save: vi.fn(async (entity: any) => ({ id: 'entry-1', ...entity })),
    remove: vi.fn(async (entity: any) => entity),
    createQueryBuilder: vi.fn(() => queryBuilder),
    __queryBuilder: queryBuilder,
  };
  // The write paths serialize via
  // repository.manager.transaction(m => ...) with an advisory xact lock;
  // the mock manager hands every getRepository() call straight back to this
  // repository so specs keep observing the same spies, and query() absorbs
  // the pg_advisory_xact_lock statement.
  const transactionalManager = {
    query: vi.fn().mockResolvedValue(undefined),
    getRepository: vi.fn(() => repository),
  };
  repository.manager = {
    transaction: vi.fn(
      async (
        work: (manager: typeof transactionalManager) => Promise<unknown>
      ) => work(transactionalManager)
    ),
    __transactionalManager: transactionalManager,
  };
  return repository;
}

export function createMockTemplateRepository() {
  return {
    findOne: vi.fn(),
  };
}

export function buildClassificationEntryService(overrides?: {
  entryRepository?: ReturnType<typeof createMockClassificationEntryRepository>;
  templateRepository?: ReturnType<typeof createMockTemplateRepository>;
}) {
  const entryRepository =
    overrides?.entryRepository ?? createMockClassificationEntryRepository();
  const templateRepository =
    overrides?.templateRepository ?? createMockTemplateRepository();
  const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };

  const service = new ClassificationEntryService(
    entryRepository as any,
    templateRepository as any,
    logger as any
  );

  return { service, entryRepository, templateRepository, logger };
}

export function makeSpaceAbout(id = 'about-1') {
  return { id } as any;
}

export function makeClassificationTemplate(
  overrides: Partial<{
    id: string;
    type: TemplateType;
    cardinality: ClassificationCardinality;
    valueSet: { id: string; label: string }[];
    displayName: string;
  }> = {}
) {
  return {
    id: overrides.id ?? 'template-1',
    type: overrides.type ?? TemplateType.CLASSIFICATION,
    classificationCardinality:
      overrides.cardinality ?? ClassificationCardinality.MULTI_SELECT,
    classificationValueSet: overrides.valueSet ?? [
      { id: 'v1', label: 'Value 1' },
      { id: 'v2', label: 'Value 2' },
    ],
    profile: { displayName: overrides.displayName ?? 'Test Classification' },
  };
}

export function makeEntry(
  overrides: Partial<ClassificationEntry> = {}
): ClassificationEntry {
  const entry = new ClassificationEntry();
  entry.id = overrides.id ?? 'entry-1';
  entry.displayLabel = overrides.displayLabel ?? 'SDGs';
  entry.cardinality =
    overrides.cardinality ?? ClassificationCardinality.MULTI_SELECT;
  entry.valueSet = overrides.valueSet ?? [
    { id: 'v1', label: 'Value 1' },
    { id: 'v2', label: 'Value 2' },
  ];
  entry.selectedValueIDs = overrides.selectedValueIDs ?? [];
  entry.display = overrides.display ?? true;
  entry.sortOrder = overrides.sortOrder ?? 1;
  entry.spaceAbout = overrides.spaceAbout ?? makeSpaceAbout();
  return entry;
}
