const DEFAULT_SESSION_PASSWORD =
  'complex_password_at_least_32_characters_long_for_security';

interface SessionEnvironment {
  NODE_ENV?: string;
  SESSION_SECRET?: string;
}

export function resolveSessionPassword(env: SessionEnvironment): string {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }

  return DEFAULT_SESSION_PASSWORD;
}

