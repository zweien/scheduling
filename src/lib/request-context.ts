import { headers } from 'next/headers';

type HeaderReader = {
  get(name: string): string | null;
};

export function extractIpAddress(headerReader: HeaderReader): string | null {
  const forwardedFor = headerReader.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  const realIp = headerReader.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

export async function getCurrentRequestIp() {
  const headerStore = await headers();
  return extractIpAddress(headerStore);
}
