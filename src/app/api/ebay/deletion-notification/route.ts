/**
 * eBay marketplace account deletion / closure notification endpoint.
 *
 * eBay will not enable production keys until this endpoint is registered
 * and validated. Validation works like this: eBay sends a GET with a
 * `challenge_code` query parameter and expects back
 *
 *     { "challengeResponse": sha256(challenge_code + verification_token + endpoint_url) }
 *
 * hex encoded, with those three strings concatenated in exactly that
 * order and nothing between them.
 *
 * The verification token and the endpoint URL are read from environment
 * variables and never from the request. The URL eBay hashes against is
 * the one registered in the developer portal, character for character, so
 * deriving it from request headers (which can carry a different host, a
 * proxy host, or a trailing slash) would produce a hash that does not
 * match and validation would fail.
 *
 * On POST, eBay is telling us a user closed their account and their data
 * must be deleted. There is no database in this app and no eBay user data
 * is stored, so the notification is logged and acknowledged. eBay only
 * requires a 200 to consider it delivered.
 */

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const challengeCode = new URL(request.url).searchParams.get('challenge_code');

  if (!challengeCode) {
    return NextResponse.json(
      { error: 'Missing challenge_code query parameter.' },
      { status: 400 },
    );
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpointUrl = process.env.EBAY_NOTIFICATION_ENDPOINT;

  if (!verificationToken || !endpointUrl) {
    console.error(
      '[ebay/deletion-notification] EBAY_VERIFICATION_TOKEN and EBAY_NOTIFICATION_ENDPOINT must both be set.',
    );
    return NextResponse.json({ error: 'Endpoint is not configured.' }, { status: 500 });
  }

  // Order matters: challenge code, then token, then the registered URL.
  const challengeResponse = createHash('sha256')
    .update(challengeCode)
    .update(verificationToken)
    .update(endpointUrl)
    .digest('hex');

  return NextResponse.json({ challengeResponse }, { status: 200 });
}

export async function POST(request: Request) {
  const payload = await request.text().catch(() => '');

  // No eBay user data is stored anywhere in this app, so there is nothing
  // to erase. Log it so there is a record that the notice arrived.
  console.log('[ebay/deletion-notification] account deletion notice received:', payload.slice(0, 2000));

  return NextResponse.json({ received: true }, { status: 200 });
}
