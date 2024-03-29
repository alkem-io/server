export enum MentionedEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
}
export abstract class Mention {
  nameId!: string;
  type!: MentionedEntityType;
}
