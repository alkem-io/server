/**
 * Discriminator for the generic Reaction record — identifies what kind of
 * entity the reaction targets so a single table serves all future reaction
 * contexts without a schema rewrite.
 *
 * Rules for introducing a new type:
 *  - Add the value here and a matching allow-list constant in the target
 *    module (the way POST maps to CALLOUT_REACTION_ALLOWED_EMOJIS).
 *  - Wire explicit target-deletion cleanup in the target entity's delete
 *    flow so orphaned reaction records are never left behind.
 */
export enum ReactionType {
  /** Reaction on a Callout (the platform's "Post"). */
  POST = 'post',
}
