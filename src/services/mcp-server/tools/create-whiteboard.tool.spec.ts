import { TemplateType } from '@common/enums/template.type';
import { ActorContext } from '@core/actor-context/actor.context';
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
    const authorization = { isAccessGranted: vi.fn().mockReturnValue(true) };
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
    expect(authorization.isAccessGranted).toHaveBeenCalledTimes(
      fromTemplate ? 1 : 0
    );
  });
});
