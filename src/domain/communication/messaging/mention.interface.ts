export enum MentionedEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL = 'vc',
}
export abstract class Mention {
  actorId!: string;
  actorType!: MentionedEntityType;
}
