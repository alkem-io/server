import { ConfigurationTypes, UserPreferenceType } from '@common/enums';
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
    const endpoint = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;

    const userSearchStr = `(${endpoint}/user/`;
    const orgSearchStr = `(${endpoint}/organization/`;

    const result: Mention[] = [];

    if (text.length === 0) return result;

    let userSearchIndex = 0;
    let orgSearchIndex = 0;
    let userMatchIndex;
    let orgMatchIndex;
    let urlEndIndex;
    let nameId;

    userMatchIndex = text.indexOf(userSearchStr, userSearchIndex);
    orgMatchIndex = text.indexOf(orgSearchStr, orgSearchIndex);
    while (userSearchIndex < text.length || orgSearchIndex < text.length) {
      if (userMatchIndex === -1 && orgMatchIndex === -1) break;

      if (userMatchIndex > -1) {
        urlEndIndex = text.indexOf(')', userMatchIndex);
        if (urlEndIndex === -1) {
          userSearchIndex = userMatchIndex + 1;
          userMatchIndex = text.indexOf(userSearchStr, userSearchIndex);
          continue;
        }
        nameId = text.substring(
          userMatchIndex + userSearchStr.length,
          urlEndIndex
        );
        result.push({ userType: MentionedEntityType.USER, nameId });
        userSearchIndex = urlEndIndex;
        userMatchIndex = text.indexOf(userSearchStr, userSearchIndex);
      }

      if (orgMatchIndex > -1) {
        urlEndIndex = text.indexOf(')', orgMatchIndex);
        if (urlEndIndex === -1) {
          orgSearchIndex = orgMatchIndex + 1;
          orgMatchIndex = text.indexOf(orgSearchStr, orgSearchIndex);
          continue;
        }
        nameId = text.substring(
          orgMatchIndex + orgSearchStr.length,
          urlEndIndex
        );
        result.push({ userType: MentionedEntityType.ORGANIZATION, nameId });
        orgSearchIndex = urlEndIndex;
        orgMatchIndex = text.indexOf(orgSearchStr, orgSearchIndex);
      }
    }

    return result;
  }
}
