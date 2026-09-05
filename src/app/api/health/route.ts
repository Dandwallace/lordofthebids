/**
 * Connection status for the header indicator.
 *
 * Reports whether the server has eBay credentials, never what they are.
 */

import { NextResponse } from 'next/server';
import { readConfigStatus } from '@/lib/ebay/config';
import type { ConnectionStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = readConfigStatus();

  const body: ConnectionStatus = {
    configured: status.configured,
    environment: status.environment,
    marketplaceId: status.marketplaceId,
    deletionEndpointConfigured: status.deletionEndpointConfigured,
    checkedAt: new Date().toISOString(),
  };

  // The list of missing variable names is developer information; it goes
  // to the server log, not to the browser.
  if (!status.configured) {
    console.warn(`[api/health] eBay not configured. Missing: ${status.missing.join(', ')}`);
  }

  return NextResponse.json(body);
}
