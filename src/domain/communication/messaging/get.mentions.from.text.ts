import { Mention, MentionedEntityType } from './mention.interface';

const MENTION_REGEX = new RegExp(
  `\\[@[^\\]]*]\\((http|https):\\/\\/[^)]*\\/(?<type>${MentionedEntityType.USER}|${MentionedEntityType.ORGANIZATION}|${MentionedEntityType.VIRTUAL_CONTRIBUTOR})\\/(?<nameid>[^)]+)\\)`,
  'gm'
);

export const getMentionsFromText = (text: string): Mention[] => {
  const result: Mention[] = [];
  for (const match of text.matchAll(MENTION_REGEX)) {
    if (match.groups?.type === MentionedEntityType.USER) {
      result.push({
        nameId: match.groups.nameid,
        type: MentionedEntityType.USER,
      });
    } else if (match.groups?.type === MentionedEntityType.ORGANIZATION) {
      result.push({
        nameId: match.groups.nameid,
        type: MentionedEntityType.ORGANIZATION,
      });
    } else if (match.groups?.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR) {
      result.push({
        nameId: match.groups.nameid,
        type: MentionedEntityType.VIRTUAL_CONTRIBUTOR,
      });
    }
  }
  return result;
};
