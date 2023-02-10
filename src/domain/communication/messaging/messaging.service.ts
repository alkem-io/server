import { UserPreferenceType } from '@common/enums';
import { IPreferenceSet } from '@domain/common/preference-set/preference.set.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagingService {
  constructor(private preferenceSetService: PreferenceSetService) {}
  public async isContactableWithDirectMessage(
    receipientUserPreferences: IPreferenceSet
  ): Promise<boolean> {
    return this.preferenceSetService.getPreferenceValue(
      receipientUserPreferences,
      UserPreferenceType.NOTIFICATION_COMMUNICATION_MESSAGE
    );
  }
}
