import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common/interfaces';

export interface CalendarEventMessageReceivedPayload
  extends BaseSubscriptionPayload {
  calendarEventID: string;
  message: CommunicationMessagePayload;
}
