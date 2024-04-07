export enum MentionedEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
}
export abstract class Mention {
  nameId!: string;
  type!: MentionedEntityType;
}
