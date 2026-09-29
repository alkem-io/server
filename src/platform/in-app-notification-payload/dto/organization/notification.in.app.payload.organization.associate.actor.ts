import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { RoleName } from '@common/enums/role.name';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadOrganizationBase } from './notification.in.app.payload.organization.base';

@ObjectType('InAppNotificationPayloadOrganizationAssociateActor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganizationAssociateActor extends InAppNotificationPayloadOrganizationBase {
  actorID!: string;
  // Set for the three application events (submitted / approved / declined).
  applicationID?: string;
  // Set for the two invitation-response events (accepted / declined).
  invitationID?: string;
  declare type: NotificationEventPayload.ORGANIZATION_ASSOCIATE_ACTOR;

  @Field(() => [RoleName], {
    nullable: true,
    description:
      'Offered extra roles that could not be granted (set only on the accepted-invitation event).',
  })
  extraRolesWithheld?: RoleName[];
}
