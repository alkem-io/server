import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICollaboraDocument } from './collabora.document.interface';

/**
 * Cascade a CollaboraDocument's authorization onto its backing Document's own
 * policy: credential rules (via inheritance) plus the contribute→update-content
 * privilege mapping the WOPI service needs to evaluate access on the file itself
 * (external services authorize against the document's own `authorizationPolicyId`).
 *
 * Mutates and returns `collaboraDocument.document.authorization`, or `undefined`
 * when there is no backing document / policy. A pure helper (no DI) so it can be
 * shared by both the full authorization-reset flow (`CollaboraDocumentAuthorizationService`)
 * and the replace flow (`CollaboraDocumentService`) without a circular dependency
 * between those two services. The caller is responsible for persisting the result.
 */
export function cascadeCollaboraAuthorizationToDocument(
  authorizationPolicyService: AuthorizationPolicyService,
  collaboraDocument: ICollaboraDocument
): IAuthorizationPolicy | undefined {
  if (
    !collaboraDocument.authorization ||
    !collaboraDocument.document?.authorization
  ) {
    return undefined;
  }
  collaboraDocument.document.authorization =
    authorizationPolicyService.inheritParentAuthorization(
      collaboraDocument.document.authorization,
      collaboraDocument.authorization
    );
  // inheritParentAuthorization only copies credential rules; the WOPI service
  // also needs the contribute→update-content privilege mapping on the document's
  // own policy.
  collaboraDocument.document.authorization =
    authorizationPolicyService.appendPrivilegeAuthorizationRules(
      collaboraDocument.document.authorization,
      authorizationPolicyService.getPrivilegeRules(
        collaboraDocument.authorization
      )
    );
  return collaboraDocument.document.authorization;
}
