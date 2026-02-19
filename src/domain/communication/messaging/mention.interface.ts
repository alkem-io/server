export enum MentionedEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL = 'vc',
}
export abstract class Mention {
  actorID!: string;
  actorType!: MentionedEntityType;
}
