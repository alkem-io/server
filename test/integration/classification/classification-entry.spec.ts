/**
 * Integration spec: Classifications on a Space's About.
 *
 * Per `server/CLAUDE.md`'s documented (but stale) testing convention this
 * would be an `*.it-spec.ts` under `test/functional/integration/`; that
 * directory does not exist on `develop` and `vitest.config.ts`'s include
 * glob does not match `it-spec.ts`, so — matching the real, precedent
 * layout (`test/integration/flow-state-layout/`) — this drives the
 * resolver + service together through NestJS-style mocked dependencies, no
 * real DB or HTTP server. The live-DB ground truth (the FK cascade on Space
 * deletion, the two-mutation host-scope rejection against a real Callout /
 * TemplateContentSpace id) is verified by the `gql-live` probes (contract
 * §6, probes 2 and 13), owned by the forge verification phase.
 */

import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
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
