import { UserPreferenceType } from '@common/enums';
import { IPreferenceSet } from '@domain/common/preference-set/preference.set.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagingService {
  constructor(private preferenceSetService: PreferenceSetService) {}

  public async isContactableWithDirectMessage(
    recipientUserPreferences: IPreferenceSet
  ): Promise<boolean> {
    return this.preferenceSetService.getPreferenceValue(
      recipientUserPreferences,
      UserPreferenceType.NOTIFICATION_COMMUNICATION_MESSAGE
    );
  }
}
