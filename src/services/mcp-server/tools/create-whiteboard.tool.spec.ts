import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateType } from '@common/enums/template.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  policyGranting,
  realAuthorizationService,
  testActor,
} from '@test/utils/authorization.refusal';
import { vi } from 'vitest';
import { McpToolArgsValidator } from '../mcp-tool-args.validator';
import { CreateWhiteboardTool } from './create-whiteboard.tool';
import { CreateWhiteboardInSpaceTool } from './create-whiteboard-in-space.tool';

describe('whiteboard creation blank and template controls', () => {
  it.each([
    ['callout', false],
    ['callout', true],
    ['space', false],
    ['space', true],
  ])('preserves %s creation with template=%s', async (target, fromTemplate) => {
    const mutate = vi.fn().mockResolvedValue({ id: 'created' });
    const templates = {
      getTemplateOrFail: vi.fn().mockResolvedValue({
        type: TemplateType.WHITEBOARD,
        authorization: {},
      }),
      getWhiteboard: vi.fn().mockResolvedValue({ id: 'source-board' }),
    };
    const authorization = { grantAccessOrFail: vi.fn().mockReturnValue(true) };
    const repository = { findOne: vi.fn().mockResolvedValue(null) };
    const tool =
      target === 'callout'
        ? new CreateWhiteboardTool(
            { createContributionOnCallout: mutate } as any,
            repository as any,
            {} as any,
            templates as any,
            authorization as any,
            {} as any
          )
        : new CreateWhiteboardInSpaceTool(
            { createCalloutOnCalloutsSet: mutate } as any,
            {
              getSpaceByIdOrNameIdOrFail: vi.fn().mockResolvedValue({
                collaboration: { calloutsSet: { id: 'set' } },
              }),
            } as any,
            repository as any,
            templates as any,
            authorization as any,
            {} as any,
            {} as any
          );
    const args = {
      [target === 'callout' ? 'calloutId' : 'spaceId']: 'target',
      displayName: 'New board',
      ...(fromTemplate ? { fromTemplateId: 'template' } : {}),
    };
    const definition = tool.getDefinition();
    expect(definition.description).toContain('use import_whiteboard_scene');
    expect(definition.description).not.toContain('forthcoming');
    expect(
      new McpToolArgsValidator().validate(
        definition.name,
        definition.inputSchema,
        args
      )
    ).toBeUndefined();
    const actor = new ActorContext();
    const result = await tool.execute(args, actor);
    expect(result.isError).toBeUndefined();
    expect(mutate).toHaveBeenCalledOnce();
    expect(mutate.mock.calls[0][0]).toBe(actor);
    const input = mutate.mock.calls[0][1];
    const whiteboard =
      target === 'callout' ? input.whiteboard : input.framing.whiteboard;
    expect(whiteboard).toEqual({
      profile: { displayName: 'New board' },
      ...(fromTemplate ? { sourceWhiteboardID: 'source-board' } : {}),
    });
    expect(templates.getWhiteboard).toHaveBeenCalledTimes(fromTemplate ? 1 : 0);
    expect(authorization.grantAccessOrFail).toHaveBeenCalledTimes(
      fromTemplate ? 1 : 0
    );
  });
});

describe('create_whiteboard — a failure inside execute', () => {
  it('propagates instead of being turned into text', async () => {
    const failure = new Error('storage down');
    const tool = new CreateWhiteboardTool(
      {
        createContributionOnCallout: vi.fn().mockRejectedValue(failure),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { verbose: vi.fn(), warn: vi.fn() } as any
    );

    await expect(
      tool.execute({ calloutId: 'callout', displayName: 'Board' }, testActor())
    ).rejects.toBe(failure);
  });
});

describe.each([
  'callout',
  'space',
])('whiteboard creation on a %s from a template', target => {
  const TEMPLATE_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

  const build = (getTemplateOrFail: ReturnType<typeof vi.fn>) => {
    const mutate = vi.fn().mockResolvedValue({ id: 'created' });
    const templates = {
      getTemplateOrFail,
      getWhiteboard: vi.fn().mockResolvedValue({ id: 'source-board' }),
    };
    const authorization = realAuthorizationService();
    const tool =
      target === 'callout'
        ? new CreateWhiteboardTool(
            { createContributionOnCallout: mutate } as any,
            { findOne: vi.fn().mockResolvedValue(null) } as any,
            {} as any,
            templates as any,
            authorization,
            { verbose: vi.fn() } as any
          )
        : new CreateWhiteboardInSpaceTool(
            { createCalloutOnCalloutsSet: mutate } as any,
            {
              getSpaceByIdOrNameIdOrFail: vi.fn().mockResolvedValue({
                collaboration: { calloutsSet: { id: 'set' } },
              }),
            } as any,
            { findOne: vi.fn().mockResolvedValue(null) } as any,
            templates as any,
            authorization,
            {} as any,
            { verbose: vi.fn() } as any
          );
    const run = () =>
      tool.execute(
        {
          [target === 'callout' ? 'calloutId' : 'spaceId']: 'target',
          displayName: 'New board',
          fromTemplateId: TEMPLATE_ID,
        },
        testActor()
      );
    return { run, mutate };
  };

  it('rejects with the not-found of a missing template', async () => {
    const missing = new EntityNotFoundException(
      'Template not found',
      LogContext.TEMPLATES
    );
    const { run, mutate } = build(vi.fn().mockRejectedValue(missing));

    await expect(run()).rejects.toBe(missing);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('rejects with the refusal for a whiteboard template the actor may not read', async () => {
    const { run } = build(
      vi.fn().mockResolvedValue({
        type: TemplateType.WHITEBOARD,
        authorization: policyGranting([]),
      })
    );

    await expect(run()).rejects.toBeInstanceOf(
      ForbiddenAuthorizationPolicyException
    );
  });

  it('refuses a template of another type the actor may not read, without naming its type', async () => {
    const { run } = build(
      vi.fn().mockResolvedValue({
        type: TemplateType.POST,
        authorization: policyGranting([]),
      })
    );

    await expect(run()).rejects.toBeInstanceOf(
      ForbiddenAuthorizationPolicyException
    );
  });

  it('names the type of a template the actor may read', async () => {
    const { run, mutate } = build(
      vi.fn().mockResolvedValue({
        type: TemplateType.POST,
        authorization: policyGranting([AuthorizationPrivilege.READ]),
      })
    );

    const result = await run();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('is not a whiteboard template');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('rejects with a storage failure as it is', async () => {
    const failure = new Error('db down');
    const { run } = build(vi.fn().mockRejectedValue(failure));

    await expect(run()).rejects.toBe(failure);
  });

  it('refuses a template of another type that has no policy, without naming its type', async () => {
    const { run } = build(
      vi.fn().mockResolvedValue({
        type: TemplateType.POST,
        authorization: undefined,
      })
    );

    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
