/**
 * Integration spec: Classifications on a Space's About.
 *
 * Per `server/CLAUDE.md`'s documented (but stale) testing convention this
 * would be an `*.it-spec.ts` under `test/functional/integration/`; that
 * directory does not exist on `develop` and `vitest.config.ts`'s include
 * glob does not match `it-spec.ts`, so — matching the real, precedent
 * layout (`test/integration/flow-state-layout/`) — this drives the
 * resolver + service together through NestJS-style mocked dependencies, no
 * real DB or HTTP server.
 *
 * This repo has NO live-Postgres test harness anywhere — the CI test
 * command is a plain `vitest run`, and every other `test/integration/**`
 * spec in this repo (see `flow-state-layout-authorization.spec.ts`,
 * `flow-state-layout-migration.spec.ts`) follows the exact same convention:
 * DB-level ground truth is proven either by asserting the migration's SQL
 * text directly (below) or deferred to the live-GraphQL verification pass
 * that runs against a real deployed stack. "Against a live DB" is not
 * literally met by this file for that reason; what follows is the maximum
 * this repo's test infrastructure can prove without one.
 */

import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AddSpaceClassifications1786600000000 } from '@src/migrations/1786600000000-AddSpaceClassifications';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ClassificationEntryResolverMutations } from '../../../src/domain/space/classification.entry/classification.entry.resolver.mutations';
import {
  buildClassificationEntryService,
  makeClassificationTemplate,
} from '../../../src/domain/space/classification.entry/classification.entry.test-helpers';

function buildResolver() {
  const { service, entryRepository, templateRepository } =
    buildClassificationEntryService();
  const authorizationService = {
    grantAccessOrFail: vi.fn().mockReturnValue(true),
  };
  const spaceLookupService = {
    getSpaceOrFail: vi.fn(),
  };
  const resolver = new ClassificationEntryResolverMutations(
    authorizationService as any,
    service,
    spaceLookupService as any
  );
  return {
    resolver,
    service,
    entryRepository,
    templateRepository,
    authorizationService,
    spaceLookupService,
  };
}

const actorContext = {} as ActorContext;

describe('Classification lifecycle — Step A -> Step B -> reload', () => {
  it('add then select persists both, visible on reload of the same entry object', async () => {
    const {
      resolver,
      entryRepository,
      templateRepository,
      spaceLookupService,
    } = buildResolver();
    const about = { id: 'about-1', authorization: { id: 'auth-1' } };
    spaceLookupService.getSpaceOrFail.mockResolvedValue({ about });
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());

    const added = await resolver.addClassificationEntryFromTemplate(
      actorContext,
      { spaceID: 'space-1', templateID: 'template-1' } as any
    );
    expect(added.selectedValueIDs).toEqual([]);

    entryRepository.findOne.mockResolvedValue(added);
    const selected = await resolver.updateClassificationEntrySelection(
      actorContext,
      { classificationEntryID: added.id, selectedValueIDs: ['v1'] } as any
    );

    expect(selected.selectedValueIDs).toEqual(['v1']);

    // "Reload" — same entry object reflects the persisted selection.
    expect(added.selectedValueIDs).toEqual(['v1']);
  });
});

describe('S-22 / R-11 — host scope: the Space lookup IS the enforcement', () => {
  it('addClassificationEntryFromTemplate rejects a spaceID that does not resolve to a Space, as "not found" — never a privilege failure', async () => {
    const { resolver, authorizationService, spaceLookupService } =
      buildResolver();
    spaceLookupService.getSpaceOrFail.mockRejectedValue(
      new EntityNotFoundException('not a space', LogContext.SPACES)
    );

    await expect(
      resolver.addClassificationEntryFromTemplate(actorContext, {
        spaceID: 'a-callouts-id',
        templateID: 'template-1',
      } as any)
    ).rejects.toThrow(EntityNotFoundException);
    // Authorization is never even consulted — the rejection happens at
    // resolution, structurally, before any privilege check runs.
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    // The resolver forwards the CALLER-SUPPLIED id verbatim to the Space
    // lookup — it is not the mock rejecting arbitrarily; it is proof the
    // untrusted id actually reaches the one place that can reject it.
    expect(spaceLookupService.getSpaceOrFail).toHaveBeenCalledWith(
      'a-callouts-id',
      expect.anything()
    );
  });

  it('createClassificationEntry rejects the same way', async () => {
    const { resolver, authorizationService, spaceLookupService } =
      buildResolver();
    spaceLookupService.getSpaceOrFail.mockRejectedValue(
      new EntityNotFoundException('not a space', LogContext.SPACES)
    );

    await expect(
      resolver.createClassificationEntry(actorContext, {
        spaceID: 'a-template-content-space-id',
        displayLabel: 'X',
        cardinality: 'multi-select',
        values: [{ label: 'A' }],
      } as any)
    ).rejects.toThrow(EntityNotFoundException);
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    expect(spaceLookupService.getSpaceOrFail).toHaveBeenCalledWith(
      'a-template-content-space-id',
      expect.anything()
    );
  });

  it("the two create mutations authorize UPDATE — the Space's existing edit right, nothing new", async () => {
    const {
      resolver,
      authorizationService,
      spaceLookupService,
      templateRepository,
    } = buildResolver();
    const about = { id: 'about-1', authorization: { id: 'auth-1' } };
    spaceLookupService.getSpaceOrFail.mockResolvedValue({ about });
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());

    await resolver.addClassificationEntryFromTemplate(actorContext, {
      spaceID: 'space-1',
      templateID: 'template-1',
    } as any);

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      about.authorization,
      AuthorizationPrivilege.UPDATE,
      expect.any(String)
    );
  });
});

describe('source template READ authorization on addClassificationEntryFromTemplate', () => {
  it('READ-authorizes the SOURCE template against its OWN policy, distinct from the destination About policy', async () => {
    const {
      resolver,
      authorizationService,
      spaceLookupService,
      templateRepository,
    } = buildResolver();
    const about = { id: 'about-1', authorization: { id: 'destination-auth' } };
    spaceLookupService.getSpaceOrFail.mockResolvedValue({ about });
    const template = makeClassificationTemplate();
    (template as any).authorization = { id: 'template-auth' };
    templateRepository.findOne.mockResolvedValue(template);

    await resolver.addClassificationEntryFromTemplate(actorContext, {
      spaceID: 'space-1',
      templateID: 'template-1',
    } as any);

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      { id: 'template-auth' },
      AuthorizationPrivilege.READ,
      expect.any(String)
    );
  });

  it('rejects the copy when the actor holds UPDATE on the destination but is denied READ on the source template — a leaked template UUID does not exfiltrate a private vocabulary', async () => {
    const {
      resolver,
      authorizationService,
      spaceLookupService,
      templateRepository,
    } = buildResolver();
    const about = { id: 'about-1', authorization: { id: 'destination-auth' } };
    spaceLookupService.getSpaceOrFail.mockResolvedValue({ about });
    const template = makeClassificationTemplate();
    (template as any).authorization = { id: 'template-auth' };
    templateRepository.findOne.mockResolvedValue(template);

    const { ForbiddenAuthorizationPolicyException } = await import(
      '@common/exceptions/forbidden.authorization.policy.exception'
    );
    authorizationService.grantAccessOrFail.mockImplementation(
      (_actor: any, authorization: any) => {
        if (authorization?.id === 'template-auth') {
          throw new ForbiddenAuthorizationPolicyException(
            'not authorized',
            AuthorizationPrivilege.READ,
            'template-auth',
            'actor-1'
          );
        }
        return true;
      }
    );

    await expect(
      resolver.addClassificationEntryFromTemplate(actorContext, {
        spaceID: 'space-1',
        templateID: 'template-1',
      } as any)
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
  });
});

describe('D1 lifecycle — zero new code in the SpaceAbout module (structural regression guard)', () => {
  // Council operator:Q6 / R-11: SpaceAboutAuthorizationService hard-throws
  // on a missing child relation, which is exactly why no classification
  // relation may ever be added to its loads. This guards against a
  // well-meaning future edit re-introducing that coupling.
  it('space.about.service.ts references no ClassificationEntry symbol', () => {
    const source = readFileSync(
      join(
        __dirname,
        '../../../src/domain/space/space.about/space.about.service.ts'
      ),
      'utf-8'
    );
    expect(source).not.toMatch(/ClassificationEntry/);
  });

  it('space.about.service.authorization.ts references no ClassificationEntry symbol', () => {
    const source = readFileSync(
      join(
        __dirname,
        '../../../src/domain/space/space.about/space.about.service.authorization.ts'
      ),
      'utf-8'
    );
    expect(source).not.toMatch(/ClassificationEntry/);
  });
});

describe('Space-deletion lifecycle — the FK cascade itself (shift-left proof of "no orphans on Space deletion")', () => {
  // The "no orphans on Space deletion" guarantee is DELIBERATELY zero
  // application code: removeSpaceAbout removes the space_about row itself,
  // and the classification_entry FK does the rest at the database level.
  // Nothing in THIS repo's test suite can execute that FK without a live
  // Postgres — but the migration's SQL text IS static, checkable proof
  // that the constraint this claim depends on was actually written,
  // matching the flow-state-layout-migration.spec.ts precedent for
  // "prove the SQL, defer the DB-level outcome to live verification".
  const migration = new AddSpaceClassifications1786600000000();

  it('the classification_entry table carries an ON DELETE CASCADE FK to space_about', () => {
    const queriedSql: string[] = [];
    const runner = {
      query: async (sql: string) => {
        queriedSql.push(sql);
        return [];
      },
    } as any;

    return migration.up(runner).then(() => {
      const fkStatement = queriedSql.find(sql =>
        sql.includes('FK_classification_entry_spaceAboutId')
      );
      expect(fkStatement).toBeDefined();
      expect(fkStatement).toContain('REFERENCES "space_about"("id")');
      expect(fkStatement).toContain('ON DELETE CASCADE');
    });
  });
});
