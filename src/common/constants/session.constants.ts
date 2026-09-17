/**
 * The privileged-session window for the self branch of account deletion: a
 * calling session must have been issued within this many milliseconds of the
 * request, or the platform refuses with `SESSION_REFRESH_REQUIRED`.
 *
 * Bound by construction to Kratos's deployed `privileged_session_max_age`
 * (15 minutes) so the two windows can never silently disagree — deletion is
 * gated on the same freshness the identity provider already enforces for its
 * own "confirm it is you" re-authentication flow.
 */
export const PRIVILEGED_SESSION_WINDOW_MS = 15 * 60 * 1000;
