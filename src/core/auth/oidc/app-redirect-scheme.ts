/**
 * The private-use URI scheme (RFC 8252 §7.1) the native shell registers as its
 * OIDC callback, derived from the deployment's own session-cookie domain.
 *
 * **Why this is a frozen map and not a configuration key** (spec Q1, operator
 * mandate M1 of `workspace#079-app-sso-handoff`):
 *
 * - The correct value is a function of the deployment, not an operator choice.
 *   `alkem.io` can only ever hand off to the production app and
 *   `sandbox-alkem.io` only to the sandbox one; there is no third answer an
 *   operator could legitimately give.
 * - Both app identifiers are immutable. `client-appstore/environments.ts`
 *   documents `appId` as *"Irreversible after first store submission"*, so the
 *   pair below cannot drift on the app's side either. The cross-repo contract
 *   check `redirect-scheme-matches-app-id` asserts that these two literals and
 *   that file's two `appId`s stay in step.
 * - A closed set of two is a strictly stronger open-redirect guard than any
 *   validation of a free-form string: the server can only ever 302 into a
 *   scheme an Alkemio app of that environment actually registers.
 *
 * An unmapped domain — every other environment, and local development, where
 * the cookie domain is empty — simply means app mode is unavailable, which is
 * the fail-closed default the whole flow is built around (FR-002/FR-004).
 *
 * A `Map` rather than an object literal on purpose: a bare record answers
 * `'constructor'` and `'__proto__'` with inherited members, and `Object.freeze`
 * does not change that.
 */
const SCHEME_BY_COOKIE_DOMAIN = new Map<string, string>([
  ['alkem.io', 'io.alkem.app'],
  ['sandbox-alkem.io', 'io.alkem.app.sandbox'],
]);

export function appRedirectSchemeFor(
  cookieDomain: string | undefined
): string | undefined {
  return SCHEME_BY_COOKIE_DOMAIN.get(cookieDomain ?? '');
}
