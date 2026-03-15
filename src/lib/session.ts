// src/lib/session.ts
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { resolveSessionPassword } from './session-config';

interface SessionData {
  isLoggedIn: boolean;
}

const sessionOptions = {
  password: resolveSessionPassword(process.env),
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
