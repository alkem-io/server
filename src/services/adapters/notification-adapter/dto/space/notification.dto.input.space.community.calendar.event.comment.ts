import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityCalendarEventComment
  extends NotificationInputBase {
  calendarEvent: ICalendarEvent;
  comments: IRoom;
  commentSent: IMessage;
}
