import { ObjectType } from '@nestjs/graphql';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { Paginate } from './paginated.type';

@ObjectType()
export class PaginatedInAppNotifications extends Paginate(
  IInAppNotification,
  'inAppNotifications'
) {}
