import { Injectable } from '@nestjs/common';

@Injectable()
// Note: This class is subject to a rename in the future, as it will likely handle all notification operations, not just reading.
export class InAppNotificationReader {
  constructor() {}
}
