export enum MentionedActorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'vc',
}
export abstract class Mention {
  actorID!: string;
  actorType!: MentionedActorType;
}
