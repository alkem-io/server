import { ActorContext } from '@core/actor-context/actor.context';

/**
 * Who may cause a file stored in another bucket to be copied into the
 * destination bucket. Such a file is copied only when it lives in
 * `sourceStorageBucketID` — a source the server itself chose, such as the
 * template being applied — or when `actorContext` can READ it. Any other file
 * is left referenced exactly as written: a copy would hand its bytes, under the
 * destination's authorization, to someone who could not read the original.
 */
export interface DocumentCopyAuthority {
  sourceStorageBucketID?: string;
  actorContext?: ActorContext;
  /**
   * Copy every file, wherever it is stored. Set only by the one-off admin
   * template repair, for templates an operator reviewed and chose to repair.
   */
  copyAnyFile?: boolean;
}
