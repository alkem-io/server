import { ObjectType } from '@nestjs/graphql';
import { Paginate } from '@core/pagination/paginated.type';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';

@ObjectType()
export class ActivityFeed extends Paginate(IActivityLogEntry, 'activityFeed') {}
