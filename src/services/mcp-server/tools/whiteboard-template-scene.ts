import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateType } from '@common/enums/template.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TemplateService } from '@domain/template/template/template.service';

/**
 * Resolve a whiteboard template's scene server-side, **by reference**. The scene
 * is loaded from the template's whiteboard (the entity's @AfterLoad hook already
 * decompresses `content` into a plain Excalidraw scene JSON string) and never
 * passes through the model — applying or creating-from a template only costs the
 * model two ids, not the whole scene. Requires READ on the template (mirrors
 * navigate_templates).
 *
 * Shared by `update_whiteboard_content` (apply a template to an existing board)
 * and `create_whiteboard` (create a new board already filled with a template).
 */
export async function resolveTemplateScene(
  templateService: TemplateService,
  authorizationService: AuthorizationService,
  templateId: string,
  actorContext: ActorContext
): Promise<{ scene: string } | { error: string }> {
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
      error: `Template ${templateId} is not a whiteboard template (type: ${template.type}). Only whiteboard templates can be applied to a whiteboard.`,
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
    return {
      error: `Template ${templateId} has no whiteboard content to apply.`,
    };
  }

  if (!templateWhiteboard.content) {
    return {
      error: `Template ${templateId} has no whiteboard content to apply.`,
    };
  }

  // The decompressed scene must be valid JSON (downstream parses it).
  try {
    JSON.parse(templateWhiteboard.content);
  } catch {
    return {
      error: `Template ${templateId} whiteboard content is not valid scene JSON.`,
    };
  }

  return { scene: templateWhiteboard.content };
}
