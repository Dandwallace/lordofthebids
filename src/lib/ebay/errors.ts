/**
 * Errors that are safe to show a person.
 *
 * Every eBay failure is turned into one of these before it leaves the
 * server. The `message` is written for the user and must never contain a
 * credential, a token, an environment variable value, or a raw upstream
 * body. Detail for debugging goes to the server log instead.
 */

export type EbayErrorKind =
  | 'notConfigured'
  | 'authFailed'
  | 'rateLimited'
  | 'upstreamUnavailable'
  | 'notFound'
  | 'badRequest';

export class EbayError extends Error {
  readonly kind: EbayErrorKind;
  readonly httpStatus: number;
  /** A concrete next step for the person reading it. */
  readonly recovery: string;

  constructor(kind: EbayErrorKind, message: string, recovery: string, httpStatus: number) {
    super(message);
    this.name = 'EbayError';
    this.kind = kind;
    this.message = message;
    this.recovery = recovery;
    this.httpStatus = httpStatus;
  }
}

export const notConfigured = () =>
  new EbayError(
    'notConfigured',
    'This app is not connected to eBay yet.',
    'The eBay API credentials have not been set on the server. See the setup steps in the project README.',
    503,
  );

export const authFailed = () =>
  new EbayError(
    'authFailed',
    'eBay rejected this app’s credentials.',
    'The keys may be wrong, expired, or for the wrong environment. Check the credentials on the server and try again.',
    502,
  );

export const rateLimited = () =>
  new EbayError(
    'rateLimited',
    'eBay’s daily call limit for this app has been reached.',
    'The allowance is shared across the whole app and resets each day. Try a shallower search depth, or wait for the reset.',
    429,
  );

export const upstreamUnavailable = () =>
  new EbayError(
    'upstreamUnavailable',
    'eBay did not respond as expected.',
    'This is usually temporary. Your search has been kept, so you can try again.',
    502,
  );

export const notFound = (what: string) =>
  new EbayError('notFound', `${what} could not be found on eBay.`, 'Check the link or try a different search.', 404);
