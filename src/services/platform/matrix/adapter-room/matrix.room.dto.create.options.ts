export type IRoomCreateOpts = {
  visibility?: Visibility;
  room_alias_name?: string;
  name?: string;
  topic?: string;
  invite?: string[];
  room_version?: string;
  creation_content?: Record<string, any>;
  is_direct?: boolean;
  power_level_content_override?: Record<string, any>;
  preset?: Preset;
};

export enum Visibility {
  Public = 'public',
  Private = 'private',
}

export enum Preset {
  PrivateChat = 'private_chat',
  TrustedPrivateChat = 'trusted_private_chat',
  PublicChat = 'public_chat',
}
