import { Mention, MentionedEntityType } from './mention.interface';

const MENTION_REGEX = new RegExp(
  `\\[@[^\\]]*\]\\(http:\\/\\/[^\)]*\\/(${MentionedEntityType.USER}|${MentionedEntityType.ORGANIZATION})([^\)]+)\\)`,
  'gm'
);

export const getMentionsFromText = (text: string): Mention[] => {
  const result: Mention[] = [];
  const mentions = [...text.matchAll(MENTION_REGEX)];
  for (const mention of mentions) {
    if (mention[1] === MentionedEntityType.USER) {
      result.push({
        nameId: mention[2].substring(1),
        type: MentionedEntityType.USER,
      });
    }
    if (mention[1] === MentionedEntityType.ORGANIZATION) {
      result.push({
        nameId: mention[2].substring(1),
        type: MentionedEntityType.ORGANIZATION,
      });
    }
  }
  return result;
};
