import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, signInByName } from '@/lib/auth';

const bodySchema = z.object({ name: z.string().trim().min(1).max(40) });

// Sign in (or sign up) by name.
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid name' }, { status: 400 });

  const user = await signInByName(parsed.data.name);
  const res = NextResponse.json({ user: { id: user.id, displayName: user.displayName } });
  res.cookies.set(AUTH_COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}

// Sign out / switch player.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' });
  return res;
}
