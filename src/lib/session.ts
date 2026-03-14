// src/lib/session.ts
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionData {
  isLoggedIn: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'scheduling_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export type Session = IronSession<SessionData>;

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
