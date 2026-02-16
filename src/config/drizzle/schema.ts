/**
 * Barrel export for all Drizzle schema definitions and relations.
 * This file is imported by DrizzleModule to build the relational query API.
 */

// ── Common Domain ──────────────────────────────────────────────────
export * from '@domain/common/authorization-policy/authorization.policy.schema';
export * from '@domain/common/authorization-policy/authorization.policy.relations';
export * from '@domain/common/profile/profile.schema';
export * from '@domain/common/profile/profile.relations';
export * from '@domain/common/reference/reference.schema';
export * from '@domain/common/reference/reference.relations';
export * from '@domain/common/tagset/tagset.schema';
export * from '@domain/common/tagset/tagset.relations';
export * from '@domain/common/tagset-template/tagset.template.schema';
export * from '@domain/common/tagset-template/tagset.template.relations';
export * from '@domain/common/tagset-template-set/tagset.template.set.schema';
export * from '@domain/common/tagset-template-set/tagset.template.set.relations';
export * from '@domain/common/visual/visual.schema';
export * from '@domain/common/visual/visual.relations';
export * from '@domain/common/location/location.schema';
export * from '@domain/common/location/location.relations';
export * from '@domain/common/form/form.schema';
export * from '@domain/common/form/form.relations';
export * from '@domain/common/lifecycle/lifecycle.schema';
export * from '@domain/common/lifecycle/lifecycle.relations';
export * from '@domain/common/nvp/nvp.schema';
export * from '@domain/common/nvp/nvp.relations';
export * from '@domain/common/whiteboard/whiteboard.schema';
export * from '@domain/common/whiteboard/whiteboard.relations';
export * from '@domain/common/license/license.schema';
export * from '@domain/common/license/license.relations';
export * from '@domain/common/license-entitlement/license.entitlement.schema';
export * from '@domain/common/license-entitlement/license.entitlement.relations';
export * from '@domain/common/classification/classification.schema';
export * from '@domain/common/classification/classification.relations';
export * from '@domain/common/memo/memo.schema';
export * from '@domain/common/memo/memo.relations';
export * from '@domain/common/media-gallery/media.gallery.schema';
export * from '@domain/common/media-gallery/media.gallery.relations';
export * from '@domain/common/knowledge-base/knowledge.base.schema';
export * from '@domain/common/knowledge-base/knowledge.base.relations';

// ── Agent ──────────────────────────────────────────────────────────
export * from '@domain/agent/agent/agent.schema';
export * from '@domain/agent/agent/agent.relations';
export * from '@domain/agent/credential/credential.schema';
export * from '@domain/agent/credential/credential.relations';

// ── Space ──────────────────────────────────────────────────────────
export * from '@domain/space/space/space.schema';
export * from '@domain/space/space/space.relations';
export * from '@domain/space/account/account.schema';
export * from '@domain/space/account/account.relations';
export * from '@domain/space/space.about/space.about.schema';
export * from '@domain/space/space.about/space.about.relations';

// ── Collaboration ──────────────────────────────────────────────────
export * from '@domain/collaboration/collaboration/collaboration.schema';
export * from '@domain/collaboration/collaboration/collaboration.relations';
export * from '@domain/collaboration/innovation-flow/innovation.flow.schema';
export * from '@domain/collaboration/innovation-flow/innovation.flow.relations';
export * from '@domain/collaboration/innovation-flow-state/innovation.flow.state.schema';
export * from '@domain/collaboration/innovation-flow-state/innovation.flow.state.relations';
export * from '@domain/collaboration/callout/callout.schema';
export * from '@domain/collaboration/callout/callout.relations';
export * from '@domain/collaboration/callout-framing/callout.framing.schema';
export * from '@domain/collaboration/callout-framing/callout.framing.relations';
export * from '@domain/collaboration/callout-contribution/callout.contribution.schema';
export * from '@domain/collaboration/callout-contribution/callout.contribution.relations';
export * from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.schema';
export * from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.relations';
export * from '@domain/collaboration/callouts-set/callouts.set.schema';
export * from '@domain/collaboration/callouts-set/callouts.set.relations';
export * from '@domain/collaboration/post/post.schema';
export * from '@domain/collaboration/post/post.relations';
export * from '@domain/collaboration/link/link.schema';
export * from '@domain/collaboration/link/link.relations';

// ── Community ──────────────────────────────────────────────────────
export * from '@domain/community/user/user.schema';
export * from '@domain/community/user/user.relations';
export * from '@domain/community/organization/organization.schema';
export * from '@domain/community/organization/organization.relations';
export * from '@domain/community/virtual-contributor/virtual.contributor.schema';
export * from '@domain/community/virtual-contributor/virtual.contributor.relations';
export * from '@domain/community/community/community.schema';
export * from '@domain/community/community/community.relations';
export * from '@domain/community/community-guidelines/community.guidelines.schema';
export * from '@domain/community/community-guidelines/community.guidelines.relations';
export * from '@domain/community/user-group/user-group.schema';
export * from '@domain/community/user-group/user-group.relations';
export * from '@domain/community/user-settings/user.settings.schema';
export * from '@domain/community/user-settings/user.settings.relations';
export * from '@domain/community/organization-verification/organization.verification.schema';
export * from '@domain/community/organization-verification/organization.verification.relations';

// ── Communication ──────────────────────────────────────────────────
export * from '@domain/communication/communication/communication.schema';
export * from '@domain/communication/communication/communication.relations';
export * from '@domain/communication/conversation/conversation.schema';
export * from '@domain/communication/conversation/conversation.relations';
export * from '@domain/communication/conversation-membership/conversation.membership.schema';
export * from '@domain/communication/conversation-membership/conversation.membership.relations';
export * from '@domain/communication/messaging/messaging.schema';
export * from '@domain/communication/messaging/messaging.relations';
export * from '@domain/communication/room/room.schema';
export * from '@domain/communication/room/room.relations';

// ── Template ───────────────────────────────────────────────────────
export * from '@domain/template/template/template.schema';
export * from '@domain/template/template/template.relations';
export * from '@domain/template/template-content-space/template.content.space.schema';
export * from '@domain/template/template-content-space/template.content.space.relations';
export * from '@domain/template/template-default/template.default.schema';
export * from '@domain/template/template-default/template.default.relations';
export * from '@domain/template/templates-manager/templates.manager.schema';
export * from '@domain/template/templates-manager/templates.manager.relations';
export * from '@domain/template/templates-set/templates.set.schema';
export * from '@domain/template/templates-set/templates.set.relations';

// ── Access ─────────────────────────────────────────────────────────
export * from '@domain/access/application/application.schema';
export * from '@domain/access/application/application.relations';
export * from '@domain/access/invitation/invitation.schema';
export * from '@domain/access/invitation/invitation.relations';
export * from '@domain/access/invitation.platform/platform.invitation.schema';
export * from '@domain/access/invitation.platform/platform.invitation.relations';
export * from '@domain/access/role/role.schema';
export * from '@domain/access/role/role.relations';
export * from '@domain/access/role-set/role.set.schema';
export * from '@domain/access/role-set/role.set.relations';

// ── Timeline ───────────────────────────────────────────────────────
export * from '@domain/timeline/timeline/timeline.schema';
export * from '@domain/timeline/timeline/timeline.relations';
export * from '@domain/timeline/calendar/calendar.schema';
export * from '@domain/timeline/calendar/calendar.relations';
export * from '@domain/timeline/event/event.schema';
export * from '@domain/timeline/event/event.relations';

// ── Storage ────────────────────────────────────────────────────────
export * from '@domain/storage/storage-aggregator/storage.aggregator.schema';
export * from '@domain/storage/storage-aggregator/storage.aggregator.relations';
export * from '@domain/storage/storage-bucket/storage.bucket.schema';
export * from '@domain/storage/storage-bucket/storage.bucket.relations';
export * from '@domain/storage/document/document.schema';
export * from '@domain/storage/document/document.relations';

// ── Innovation Hub ─────────────────────────────────────────────────
export * from '@domain/innovation-hub/innovation.hub.schema';
export * from '@domain/innovation-hub/innovation.hub.relations';

// ── Platform ───────────────────────────────────────────────────────
export * from '@platform/activity/activity.schema';
export * from '@platform/activity/activity.relations';
export * from '@platform/forum/forum.schema';
export * from '@platform/forum/forum.relations';
export * from '@platform/forum-discussion/discussion.schema';
export * from '@platform/forum-discussion/discussion.relations';
export * from '@platform/in-app-notification/in.app.notification.schema';
export * from '@platform/in-app-notification/in.app.notification.relations';
export * from '@platform/licensing/credential-based/license-plan/license.plan.schema';
export * from '@platform/licensing/credential-based/license-plan/license.plan.relations';
export * from '@platform/licensing/credential-based/license-policy/license.policy.schema';
export * from '@platform/licensing/credential-based/license-policy/license.policy.relations';
export * from '@platform/licensing/credential-based/licensing-framework/licensing.framework.schema';
export * from '@platform/licensing/credential-based/licensing-framework/licensing.framework.relations';
export * from '@platform/platform/platform.schema';
export * from '@platform/platform/platform.relations';

// ── AI Server ──────────────────────────────────────────────────────
export * from '@src/services/ai-server/ai-persona/ai.persona.schema';
export * from '@src/services/ai-server/ai-persona/ai.persona.relations';
export * from '@src/services/ai-server/ai-server/ai.server.schema';
export * from '@src/services/ai-server/ai-server/ai.server.relations';

// ── Library ────────────────────────────────────────────────────────
export * from '@library/innovation-pack/innovation.pack.schema';
export * from '@library/innovation-pack/innovation.pack.relations';
export * from '@library/library/library.schema';
export * from '@library/library/library.relations';
