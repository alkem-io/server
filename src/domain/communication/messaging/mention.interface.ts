export enum MentionedEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'vc',
}
export abstract class Mention {
  id!: string;
  type!: MentionedEntityType;
}
