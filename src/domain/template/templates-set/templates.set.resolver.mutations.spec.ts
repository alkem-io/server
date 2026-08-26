import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { WhiteboardDraftService } from '@domain/common/whiteboard-draft';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { vi } from 'vitest';
import { TemplateService } from '../template/template.service';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';

describe('TemplatesSetResolverMutations', () => {
  let resolver: TemplatesSetResolverMutations;
  let authorizationService: { grantAccessOrFail: ReturnType<typeof vi.fn> };
  let authorizationPolicyService: { saveAll: ReturnType<typeof vi.fn> };
  let templatesSetService: {
    getTemplatesSetOrFail: ReturnType<typeof vi.fn>;
    createTemplate: ReturnType<typeof vi.fn>;
    createTemplateFromSpace: ReturnType<typeof vi.fn>;
    createTemplateFromContentSpace: ReturnType<typeof vi.fn>;
  };
  let templateAuthorizationService: {
    applyAuthorizationPolicy: ReturnType<typeof vi.fn>;
  };
  let templateService: {
    getTemplateOrFail: ReturnType<typeof vi.fn>;
    prepareContributionDefaultSource: ReturnType<typeof vi.fn>;
  };
  let spaceLookupService: { getSpaceOrFail: ReturnType<typeof vi.fn> };
  let templateContentSpaceService: {
    getTemplateContentSpaceOrFail: ReturnType<typeof vi.fn>;
  };
  let whiteboardService: {
    getWhiteboardOrFail: ReturnType<typeof vi.fn>;
  };
  let whiteboardDraftService: {
    acquireForConsumption: ReturnType<typeof vi.fn>;
    materialize: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authorizationService = { grantAccessOrFail: vi.fn() };
    authorizationPolicyService = { saveAll: vi.fn() };
    templatesSetService = {
      getTemplatesSetOrFail: vi.fn(),
      createTemplate: vi.fn(),
      createTemplateFromSpace: vi.fn(),
      createTemplateFromContentSpace: vi.fn(),
    };
    templateAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
    templateService = {
      getTemplateOrFail: vi.fn(),
      prepareContributionDefaultSource: vi.fn(),
    };
    spaceLookupService = { getSpaceOrFail: vi.fn() };
    templateContentSpaceService = { getTemplateContentSpaceOrFail: vi.fn() };
    whiteboardService = {
      getWhiteboardOrFail: vi.fn(),
    };
    const releaseDraftLock = vi.fn();
    whiteboardDraftService = {
      acquireForConsumption: vi.fn().mockResolvedValue({
        drafts: new Map(),
        complete: vi.fn(),
        release: releaseDraftLock,
        [Symbol.asyncDispose]: releaseDraftLock,
      }),
      materialize: vi.fn(),
    };

    resolver = new TemplatesSetResolverMutations(
      authorizationService as unknown as AuthorizationService,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
      templatesSetService as unknown as TemplatesSetService,
      templateAuthorizationService as unknown as TemplateAuthorizationService,
      templateService as unknown as TemplateService,
      spaceLookupService as unknown as SpaceLookupService,
      templateContentSpaceService as unknown as TemplateContentSpaceService,
      whiteboardService as unknown as WhiteboardService,
      whiteboardDraftService as unknown as WhiteboardDraftService,
      {
        getStorageAggregatorForTemplatesSet: vi.fn(),
      } as unknown as StorageAggregatorResolverService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should check authorization, create template, apply auth policy, and return result', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);

      const template = { id: 'tpl-1' };
      templatesSetService.createTemplate.mockResolvedValue(template);
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const actorContext = { actorID: 'user-1' } as any;
      const templateData = { templatesSetID: 'ts-1' } as any;

      const result = await resolver.createTemplate(actorContext, templateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(templatesSetService.createTemplate).toHaveBeenCalledWith(
        templatesSet,
        templateData,
        actorContext
      );
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
      expect(result).toBe(template);
    });

    it('holds an owned framing draft through final creation and deletes it before releasing', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);
      const template = { id: 'tpl-1' };
      templatesSetService.createTemplate.mockResolvedValue(template);
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue({
        id: 'draft-wb',
        authorization: { id: 'draft-auth' },
      });
      const order: string[] = [];
      const complete = vi.fn(async () => {
        order.push('complete');
      });
      const release = vi.fn(async () => {
        order.push('release');
      });
      whiteboardDraftService.acquireForConsumption.mockResolvedValue({
        drafts: new Map([['draft-wb', { id: 'draft-wb' }]]),
        complete,
        release,
        [Symbol.asyncDispose]: release,
      });
      const input = {
        templatesSetID: 'ts-1',
        whiteboard: { draftWhiteboardID: 'draft-wb' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;

      await resolver.createTemplate(actorContext, input);

      expect(whiteboardDraftService.acquireForConsumption).toHaveBeenCalledWith(
        ['draft-wb'],
        actorContext
      );
      expect(input.whiteboard).toEqual({
        draftWhiteboardID: undefined,
        sourceWhiteboardID: 'draft-wb',
      });
      expect(order).toEqual(['complete', 'release']);
    });

    it('does NOT load a source whiteboard when the template has no sourceWhiteboardID', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);
      templatesSetService.createTemplate.mockResolvedValue({ id: 'tpl-1' });
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue({ id: 'tpl-1' });

      await resolver.createTemplate(
        { actorID: 'user-1' } as any,
        {
          templatesSetID: 'ts-1',
          whiteboard: { content: 'x' },
        } as any
      );

      expect(whiteboardService.getWhiteboardOrFail).not.toHaveBeenCalled();
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(1); // CREATE only
    });

    it('requires READ on the SOURCE whiteboard before copying it (duplicate/import)', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);
      const source = { id: 'src-wb-1', authorization: { id: 'src-auth' } };
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(source);
      templatesSetService.createTemplate.mockResolvedValue({ id: 'tpl-1' });
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue({ id: 'tpl-1' });

      await resolver.createTemplate(
        { actorID: 'user-1' } as any,
        {
          templatesSetID: 'ts-1',
          whiteboard: { sourceWhiteboardID: 'src-wb-1' },
        } as any
      );

      // Loaded WITH its authorization, then READ-checked before the copy.
      expect(whiteboardService.getWhiteboardOrFail).toHaveBeenCalledWith(
        'src-wb-1',
        {
          relations: { authorization: true },
        }
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2); // CREATE + READ(source)
      expect(authorizationService.grantAccessOrFail).toHaveBeenLastCalledWith(
        expect.anything(),
        source.authorization,
        AuthorizationPrivilege.READ,
        expect.stringContaining('src-wb-1')
      );
    });

    it('propagates a Forbidden from the source READ check (does not create the template)', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue({
        id: 'src-wb-1',
        authorization: { id: 'src-auth' },
      });
      // First grant (CREATE) ok; second grant (source READ) throws.
      authorizationService.grantAccessOrFail
        .mockImplementationOnce(() => {})
        .mockImplementationOnce(() => {
          throw new Error('Forbidden');
        });

      await expect(
        resolver.createTemplate(
          { actorID: 'user-1' } as any,
          {
            templatesSetID: 'ts-1',
            whiteboard: { sourceWhiteboardID: 'src-wb-1' },
          } as any
        )
      ).rejects.toThrow('Forbidden');

      expect(templatesSetService.createTemplate).not.toHaveBeenCalled();
    });

    it('delegates contribution-default source preparation to TemplateService', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);
      templatesSetService.createTemplate.mockResolvedValue({ id: 'tpl-1' });
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue({ id: 'tpl-1' });
      const input = {
        templatesSetID: 'ts-1',
        calloutData: {
          contributionDefaults: { sourceCalloutID: 'source-callout' },
        },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;

      await resolver.createTemplate(actorContext, input);

      expect(
        templateService.prepareContributionDefaultSource
      ).toHaveBeenCalledWith(
        input.calloutData.contributionDefaults,
        actorContext
      );
      expect(templatesSetService.createTemplate).toHaveBeenCalledWith(
        templatesSet,
        input,
        actorContext
      );
    });
  });

  describe('createTemplateFromSpace', () => {
    it('should check both template set and space authorization', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);

      const space = { id: 'space-1', authorization: { id: 'space-auth' } };
      spaceLookupService.getSpaceOrFail.mockResolvedValue(space);

      const template = { id: 'tpl-1' };
      templatesSetService.createTemplateFromSpace.mockResolvedValue(template);
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const actorContext = { actorID: 'user-1' } as any;
      const templateData = {
        templatesSetID: 'ts-1',
        spaceID: 'space-1',
      } as any;

      await resolver.createTemplateFromSpace(actorContext, templateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
      expect(templatesSetService.createTemplateFromSpace).toHaveBeenCalledWith(
        templatesSet,
        templateData,
        actorContext
      );
    });
  });

  describe('createTemplateFromContentSpace', () => {
    it('should check both template set and content space authorization', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);

      const contentSpace = {
        id: 'tcs-1',
        authorization: { id: 'tcs-auth' },
      };
      templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
        contentSpace
      );

      const template = { id: 'tpl-1' };
      templatesSetService.createTemplateFromContentSpace.mockResolvedValue(
        template
      );
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const actorContext = { actorID: 'user-1' } as any;
      const templateData = {
        templatesSetID: 'ts-1',
        contentSpaceID: 'tcs-1',
      } as any;

      await resolver.createTemplateFromContentSpace(actorContext, templateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
      expect(
        templatesSetService.createTemplateFromContentSpace
      ).toHaveBeenCalledWith(templatesSet, templateData, actorContext);
    });
  });
});
