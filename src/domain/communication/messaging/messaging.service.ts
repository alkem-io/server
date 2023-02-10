import { UserPreferenceType } from '@common/enums';
import { IPreferenceSet } from '@domain/common/preference-set/preference.set.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { Mention, MentionedEntityType } from './mention.interface';

@Injectable()
export class MessagingService {
  constructor(
    private preferenceSetService: PreferenceSetService,
    private configService: ConfigService
  ) {}

  public async isContactableWithDirectMessage(
    receipientUserPreferences: IPreferenceSet
  ): Promise<boolean> {
    return this.preferenceSetService.getPreferenceValue(
      receipientUserPreferences,
      UserPreferenceType.NOTIFICATION_COMMUNICATION_MESSAGE
    );
  }

  public async getMentionsFromText(text: string): Promise<Mention[]> {
    const mentionRegex =
      /\[@[^\]]*\]\(http:\/\/[^\)]*\/(user|organization)([^\)]+)\)/gm;
    const result: Mention[] = [];
    const mentions = [...text.matchAll(mentionRegex)];
    for (const mention of mentions) {
      if (mention[1] === MentionedEntityType.USER) {
        result.push({
          nameId: mention[2].substring(1),
          userType: MentionedEntityType.USER,
        });
      }
      if (mention[1] === MentionedEntityType.ORGANIZATION) {
        result.push({
          nameId: mention[2].substring(1),
          userType: MentionedEntityType.ORGANIZATION,
        });
      }
    }
    return result;
  }
}
