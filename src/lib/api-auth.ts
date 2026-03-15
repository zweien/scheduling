import type { NextRequest } from 'next/server';
import { verifyApiToken } from './api-tokens';

export function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

export function authenticateApiRequest(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  return verifyApiToken(token);
}
