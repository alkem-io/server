import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateType } from '@common/enums/template.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TemplateService } from '@domain/template/template/template.service';

/**
 * Resolve a whiteboard template to the id of its stored whiteboard, so a create
 * can seed the new board from THAT whiteboard's Yjs-V2 snapshot via the server-side
 * `sourceWhiteboardID` copy path (WhiteboardService.createWhiteboard, #29). The
 * snapshot is copied verbatim — one Yjs content representation everywhere, never an
 * Excalidraw scene/JSON crossing the model or the wire. Requires READ on the
 * template (mirrors navigate_templates).
 *
 * Shared by `create_whiteboard` and `create_whiteboard_in_space`.
 */
export async function resolveTemplateWhiteboardId(
  templateService: TemplateService,
  authorizationService: AuthorizationService,
  templateId: string,
  actorContext: ActorContext
): Promise<{ whiteboardId: string } | { error: string }> {
  let template: Awaited<ReturnType<TemplateService['getTemplateOrFail']>>;
  try {
    template = await templateService.getTemplateOrFail(templateId, {
      relations: { authorization: true },
    });
  } catch {
    return { error: `Template not found: ${templateId}` };
  }

  if (template.type !== TemplateType.WHITEBOARD) {
    return {
      error: `Template ${templateId} is not a whiteboard template (type: ${template.type}). Only whiteboard templates can seed a whiteboard.`,
    };
  }

  if (template.authorization) {
    const canRead = authorizationService.isAccessGranted(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.READ
    );
    if (!canRead) {
      return {
        error:
          'Access denied: you do not have permission to read this template.',
      };
    }
  }

  let templateWhiteboard: Awaited<ReturnType<TemplateService['getWhiteboard']>>;
  try {
    templateWhiteboard = await templateService.getWhiteboard(templateId);
  } catch {
    return { error: `Template ${templateId} has no whiteboard to apply.` };
  }

  return { whiteboardId: templateWhiteboard.id };
}
