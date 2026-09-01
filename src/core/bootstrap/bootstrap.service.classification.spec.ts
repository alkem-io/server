/**
 * ensureClassificationTemplatesArePresent — the D3-mandated seed (SDGs) into a
 * dedicated, listed InnovationPack.
 *
 * Covers, at the unit level (mocked dependencies, no real DB — the
 * multi-process advisory-lock race itself is a live probe, contract §6
 * probe 12):
 *   - idempotent re-run: 0 duplicate creates when every definition already
 *     exists (FR-005d, SC-003a)
 *   - an existing template is never touched again by the ensure step — the
 *     mechanism by which "an edit survives re-seed" holds
 *   - only genuinely absent definitions are created; unrelated CLASSIFICATION
 *     templates already in the pack are ignored rather than reconciled
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
 * NOT covered, because it does not exist: re-seed suppression for an
 * admin-deleted definition. The ensure step is create-if-absent and nothing
 * else, so deleting a seeded template means it comes back on the next
 * bootstrap. That is the accepted behaviour (operator ruling, 2026-08-19).
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
import { bootstrapClassificationTemplateDefinitions } from './platform-template-definitions/classification-templates/classification.template.definitions';

describe('BootstrapService — ensureClassificationTemplatesArePresent (D3)', () => {
  let service: BootstrapService;
  const mocks: Record<string, any> = {};

  // The behavioural tests derive from the seed array rather than hardcoding
  // it: adding a vocabulary is meant to be purely additive, and pinning counts
  // to literals would fail on that change for no behavioural reason. Exactly
  // one test below deliberately pins the contents, as a tripwire.
  const seededNameIDs = bootstrapClassificationTemplateDefinitions.map(
    definition => definition.nameID
  );
  const asExisting = (nameIDs: string[], authorization?: any) =>
    nameIDs.map((nameID, index) => ({
      id: `t${index + 1}`,
      nameID,
      ...(authorization ? { authorization } : {}),
    }));

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

  it('creates every seeded definition when the pack is new and empty', async () => {
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
    expect(mocks.templatesSetService.createTemplate).toHaveBeenCalledTimes(
      seededNameIDs.length
    );
    const calls = mocks.templatesSetService.createTemplate.mock.calls;
    expect(calls.map((call: any[]) => call[1].nameID)).toEqual(seededNameIDs);
    expect(
      calls.every((call: any[]) => call[1].type === TemplateType.CLASSIFICATION)
    ).toBe(true);
  });

  it('seeds SDGs — the one vocabulary the spec actually fixes the values of', async () => {
    // Guard against re-inventing a vocabulary: FR-005a mandates SDGs and only
    // offers Language/Sector as examples, so anything else appearing here is a
    // taxonomy decision that needs a human, not a silent seed.
    expect(seededNameIDs).toEqual(['sdgs']);
    const sdgs = bootstrapClassificationTemplateDefinitions[0];
    expect(sdgs.values).toHaveLength(17);
    expect(sdgs.values.map(value => value.id)).toEqual(
      Array.from({ length: 17 }, (_, index) => `sdg-${index + 1}`)
    );
  });

  it('is idempotent: a second run with every definition already present creates nothing', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      asExisting(seededNameIDs)
    );

    await runEnsure();

    expect(mocks.templatesSetService.createTemplate).not.toHaveBeenCalled();
    expect(
      mocks.accountService.createInnovationPackOnAccount
    ).not.toHaveBeenCalled();
  });

  it('creates only the genuinely absent definitions, ignoring unrelated templates in the pack', async () => {
    // An admin-authored CLASSIFICATION template shares the pack; it is not a
    // seed, so it must neither suppress nor be reconciled by the ensure step.
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      asExisting(['some-admin-authored-vocabulary'])
    );

    await runEnsure();

    const createdNameIDs =
      mocks.templatesSetService.createTemplate.mock.calls.map(
        (call: any[]) => call[1].nameID
      );
    expect(createdNameIDs).toEqual(seededNameIDs);
    expect(createdNameIDs).not.toContain('some-admin-authored-vocabulary');
  });

  it('never re-creates or updates an existing definition — an edit survives re-seed by construction', async () => {
    // Matching is on nameID alone: an admin who renamed the template and
    // rewrote its value set keeps those edits, because the ensure step has no
    // reconcile path at all — it can only create what is absent.
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      seededNameIDs.map((nameID, index) => ({
        id: `t${index + 1}`,
        nameID,
        profile: { displayName: 'Renamed by an admin' },
        classification: { values: [{ id: 'custom', label: 'Custom' }] },
      }))
    );

    await runEnsure();

    expect(mocks.templatesSetService.createTemplate).not.toHaveBeenCalled();
  });

  it('D3 fix 2: forces the pack PUBLIC + listed even when it already existed but was left ACCOUNT-visible', async () => {
    mocks.innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue(
      {
        id: 'classification-pack-1',
        searchVisibility: SearchVisibility.ACCOUNT,
        listedInStore: false,
      }
    );
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      asExisting(seededNameIDs)
    );

    await runEnsure();

    expect(mocks.innovationPackService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        searchVisibility: SearchVisibility.PUBLIC,
        listedInStore: true,
      })
    );
  });

  it('D3 fix 1: issues the advisory-lock statement on every run', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      asExisting(seededNameIDs)
    );

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
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      asExisting(seededNameIDs, { credentialRules: [{ name: 'rule' }] })
    );

    await runEnsure();

    expect(
      mocks.accountAuthorizationService.applyAuthorizationPolicy
    ).not.toHaveBeenCalled();
    expect(mocks.authorizationPolicyService.saveAll).not.toHaveBeenCalled();
  });

  it('D3 fix 3 self-heal: runs the scoped auth reset on a full no-op re-run when a pre-existing template still carries empty credentialRules (already-seeded / upgrade path)', async () => {
    mocks.templatesSetService.getTemplatesOfType.mockResolvedValue(
      asExisting(seededNameIDs, { credentialRules: [] })
    );

    await runEnsure();

    expect(mocks.templatesSetService.createTemplate).not.toHaveBeenCalled();
    expect(
      mocks.accountAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(expect.objectContaining({ id: 'host-account-1' }));
    expect(mocks.authorizationPolicyService.saveAll).toHaveBeenCalled();
  });
});
