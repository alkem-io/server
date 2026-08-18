/**
 * ensureClassificationTemplatesArePresent — the D3-mandated seed (SDGs,
 * Language, Sector) into a dedicated, listed InnovationPack.
 *
 * Covers, at the unit level (mocked dependencies, no real DB — the
 * multi-process advisory-lock race itself is a live probe, contract §6
 * probe 12):
 *   - idempotent re-run: 0 duplicate creates when every definition already
 *     exists (FR-005d, SC-003a)
 *   - an existing template is never touched again by the ensure step — the
 *     mechanism by which "an edit survives re-seed" holds
 *   - D3 fix 2: searchVisibility is forced PUBLIC after any create, even
 *     when the existing pack was left ACCOUNT-visible by a prior partial run
 *   - D3 fix 1: the advisory-lock statement is issued for every run
 *   - D3 fix 3 firing rule: the seed's own scoped auth reset runs when
 *     something was actually created, on a full no-op re-run where every
 *     existing template's policy is already populated it does NOT re-run,
 *     but a full no-op re-run where a pre-existing template's policy was
 *     left empty by a prior bootstrap self-heals by running the reset
 *     anyway (the already-seeded / upgrade path)
 *
 *   - an admin-deleted seeded template is NEVER restored — the pack's own
 *     `deletedSeedTemplateNameIDs` tombstone (written by
 *     TemplateService.delete, see recordSeedTemplateDeletionIfInAnInnovationPack)
 *     is consulted alongside `existingNameIDs`, so create-if-absent skips a
 *     deleted definition exactly like an already-present one
 */
import { LogContext } from '@common/enums/logging.context';
import { SearchVisibility } from '@common/enums/search.visibility';
import { TemplateType } from '@common/enums/template.type';
import { Account } from '@domain/space/account/account.entity';
import { Space } from '@domain/space/space/space.entity';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BootstrapService } from './bootstrap.service';

describe('BootstrapService — ensureClassificationTemplatesArePresent (D3)', () => {
  let service: BootstrapService;
  const mocks: Record<string, any> = {};

  const runEnsure = () =>
    (service as any).ensureClassificationTemplatesArePresent();

  beforeEach(async () => {
    vi.restoreAllMocks();

    mocks.organizationLookupService = {
      getOrganizationByNameIdOrFail: vi
        .fn()
        .mockResolvedValue({ id: 'host-org-1' }),
    };
    mocks.organizationService = {
      getAccount: vi.fn().mockResolvedValue({ id: 'host-account-1' }),
    };
    mocks.accountService = {
      createInnovationPackOnAccount: vi.fn().mockResolvedValue({
        id: 'classification-pack-1',
        searchVisibility: SearchVisibility.ACCOUNT, // hardcoded by createInnovationPack — D3 fix 2 must correct it
        listedInStore: true,
      }),
    };
    mocks.accountAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.authorizationPolicyService = {
      saveAll: vi.fn().mockResolvedValue(undefined),
      validateAuthorization: vi.fn(),
      getCredentialRules: vi.fn().mockReturnValue([]),
    };
    mocks.innovationPackService = {
      getInnovationPackByNameIdOrFail: vi.fn().mockResolvedValue({
        id: 'classification-pack-1',
        searchVisibility: SearchVisibility.PUBLIC,
        listedInStore: true,
      }),
      save: vi.fn().mockImplementation(async (pack: any) => pack),
      getTemplatesSetOrFail: vi
        .fn()
        .mockResolvedValue({ id: 'classification-templates-set-1' }),
    };
    mocks.templatesSetService = {
      createTemplate: vi.fn().mockResolvedValue({ id: 'tmpl-new' }),
      getTemplatesOfType: vi.fn().mockResolvedValue([]),
    };
    const lockQuery = vi.fn().mockResolvedValue(undefined);
    mocks.entityManager = {
      transaction: vi.fn(async (runInTransaction: any) =>
        runInTransaction({ query: lockQuery })
      ),
      __lockQuery: lockQuery,
    };

    const { OrganizationLookupService } = await import(
      '@domain/community/organization-lookup/organization.lookup.service'
    );
    const { OrganizationService } = await import(
      '@domain/community/organization/organization.service'
    );
    const { AccountService } = await import(
      '@domain/space/account/account.service'
    );
    const { AccountAuthorizationService } = await import(
      '@domain/space/account/account.service.authorization'
    );
    const { AuthorizationPolicyService } = await import(
      '@domain/common/authorization-policy/authorization.policy.service'
    );
    const { TemplatesSetService } = await import(
      '@domain/template/templates-set/templates.set.service'
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Account),
        repositoryProviderMockFactory(Space),
        { provide: ConfigService, useValue: { get: vi.fn() } },
        {
          provide: OrganizationLookupService,
          useValue: mocks.organizationLookupService,
        },
        { provide: OrganizationService, useValue: mocks.organizationService },
        { provide: AccountService, useValue: mocks.accountService },
        {
          provide: AccountAuthorizationService,
          useValue: mocks.accountAuthorizationService,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: mocks.authorizationPolicyService,
        },
        { provide: TemplatesSetService, useValue: mocks.templatesSetService },
        {
          provide: InnovationPackService,
          useValue: mocks.innovationPackService,
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: mocks.entityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(BootstrapService);
  });

  it('creates all three definitions when the pack is new and empty', async () => {
    // getClassificationPackIfExists only swallows a genuine
    // EntityNotFoundException — use the real class so the catch branch matches.
    const { EntityNotFoundException } = await import('@common/exceptions');
    mocks.innovationPackService.getInnovationPackByNameIdOrFail.mockRejectedValueOnce(
      new EntityNotFoundException('absent', LogContext.LIBRARY)
    );

    await runEnsure();

    expect(
      mocks.accountService.createInnovationPackOnAccount
    ).toHaveBeenCalledWith(
      expect.objectContaining({ nameID: 'platform-classifications' })
    );
    expect(mocks.templatesSetService.createTemplate).toHaveBeenCalledTimes(3);
    const createdTypes =
      mocks.templatesSetService.createTemplate.mock.calls.map(
        (call: any[]) => call[1].type
      );
    expect(
      createdTypes.every((t: string) => t === TemplateType.CLASSIFICATION)
    ).toBe(true);
  });

  it('is idempotent: a second run with all three already present creates nothing', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      { id: 't1', nameID: 'sdgs' },
      { id: 't2', nameID: 'language' },
      { id: 't3', nameID: 'sector' },
    ]);

    await runEnsure();

    expect(mocks.templatesSetService.createTemplate).not.toHaveBeenCalled();
    expect(
      mocks.accountService.createInnovationPackOnAccount
    ).not.toHaveBeenCalled();
  });

  it('never restores an admin-deleted definition — the pack tombstone is consulted alongside existingNameIDs', async () => {
    mocks.innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue(
      {
        id: 'classification-pack-1',
        searchVisibility: SearchVisibility.PUBLIC,
        listedInStore: true,
        deletedSeedTemplateNameIDs: ['sdgs'],
      }
    );
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      { id: 't2', nameID: 'language' },
    ]);

    await runEnsure();

    // 'sdgs' is tombstoned (admin-deleted), 'language' already exists —
    // only 'sector' is genuinely missing and gets created.
    expect(mocks.templatesSetService.createTemplate).toHaveBeenCalledTimes(1);
    const createdNameIDs =
      mocks.templatesSetService.createTemplate.mock.calls.map(
        (call: any[]) => call[1].nameID
      );
    expect(createdNameIDs).toEqual(['sector']);
    expect(createdNameIDs).not.toContain('sdgs');
  });

  it('never re-creates or updates an existing definition — an edit survives re-seed by construction', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      { id: 't1', nameID: 'sdgs' },
    ]);

    await runEnsure();

    // Only the two MISSING definitions are created; 'sdgs' is never touched.
    expect(mocks.templatesSetService.createTemplate).toHaveBeenCalledTimes(2);
    const createdNameIDs =
      mocks.templatesSetService.createTemplate.mock.calls.map(
        (call: any[]) => call[1].nameID
      );
    expect(createdNameIDs).not.toContain('sdgs');
  });

  it('D3 fix 2: forces the pack PUBLIC + listed even when it already existed but was left ACCOUNT-visible', async () => {
    mocks.innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue(
      {
        id: 'classification-pack-1',
        searchVisibility: SearchVisibility.ACCOUNT,
        listedInStore: false,
      }
    );
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      { id: 't1', nameID: 'sdgs' },
      { id: 't2', nameID: 'language' },
      { id: 't3', nameID: 'sector' },
    ]);

    await runEnsure();

    expect(mocks.innovationPackService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        searchVisibility: SearchVisibility.PUBLIC,
        listedInStore: true,
      })
    );
  });

  it('D3 fix 1: issues the advisory-lock statement on every run', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      { id: 't1', nameID: 'sdgs' },
      { id: 't2', nameID: 'language' },
      { id: 't3', nameID: 'sector' },
    ]);

    await runEnsure();

    expect(mocks.entityManager.__lockQuery).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_xact_lock')
    );
  });

  it('D3 fix 3: runs the scoped auth reset when the run created something', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([]);

    await runEnsure();

    expect(
      mocks.accountAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(expect.objectContaining({ id: 'host-account-1' }));
    expect(mocks.authorizationPolicyService.saveAll).toHaveBeenCalled();
  });

  it('D3 fix 3: does NOT run the scoped auth reset on a full no-op re-run when every existing template already has policy rules', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      {
        id: 't1',
        nameID: 'sdgs',
        authorization: { credentialRules: [{ name: 'rule' }] },
      },
      {
        id: 't2',
        nameID: 'language',
        authorization: { credentialRules: [{ name: 'rule' }] },
      },
      {
        id: 't3',
        nameID: 'sector',
        authorization: { credentialRules: [{ name: 'rule' }] },
      },
    ]);

    await runEnsure();

    expect(
      mocks.accountAuthorizationService.applyAuthorizationPolicy
    ).not.toHaveBeenCalled();
    expect(mocks.authorizationPolicyService.saveAll).not.toHaveBeenCalled();
  });

  it('D3 fix 3 self-heal: runs the scoped auth reset on a full no-op re-run when a pre-existing template still carries empty credentialRules (already-seeded / upgrade path)', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue([
      {
        id: 't1',
        nameID: 'sdgs',
        authorization: { credentialRules: [] },
      },
      {
        id: 't2',
        nameID: 'language',
        authorization: { credentialRules: [{ name: 'rule' }] },
      },
      {
        id: 't3',
        nameID: 'sector',
        authorization: { credentialRules: [{ name: 'rule' }] },
      },
    ]);

    await runEnsure();

    expect(mocks.templatesSetService.createTemplate).not.toHaveBeenCalled();
    expect(
      mocks.accountAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(expect.objectContaining({ id: 'host-account-1' }));
    expect(mocks.authorizationPolicyService.saveAll).toHaveBeenCalled();
  });
});
