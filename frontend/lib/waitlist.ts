// Waitlist mode: while the Contextly backend is offline, every route that needs
// the API (sign-in, dashboard, billing) sends visitors to /waitlist instead of a
// login screen that cannot work.
//
// Turn it off by setting NEXT_PUBLIC_WAITLIST_MODE=off in the Vercel project (or
// flipping the default below) and redeploying.
export const WAITLIST_MODE = process.env.NEXT_PUBLIC_WAITLIST_MODE !== "off";

export const WAITLIST_PATH = "/waitlist";

/** Where a "sign in" / "sign up" / "dashboard" link should really go right now. */
export function authHref(realHref: string): string {
  return WAITLIST_MODE ? WAITLIST_PATH : realHref;
}

/** Button text: the waitlist wording while in waitlist mode, otherwise the original. */
export function authLabel(realLabel: string, waitlistLabel = "Join the waitlist"): string {
  return WAITLIST_MODE ? waitlistLabel : realLabel;
}
