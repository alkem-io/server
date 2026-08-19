/**
 * The stable `nameID` of the singleton `virtual-assistant` platform actor.
 *
 * There is exactly one `virtual-assistant` actor on the platform (the identity
 * the web AI assistant is attributed to, FR-016). It is seeded by the
 * VirtualAssistant migration and resolved by nameID at runtime. Must match the
 * `ASSISTANT_ACTOR_NAMEID` referenced across the 004-web-ai-assistant slices.
 */
export const ASSISTANT_ACTOR_NAMEID = 'virtual-assistant';
