import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  LAST_NAME_COOKIE,
  currentUserId,
  signInByName,
} from '@/lib/auth';

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
  // Remembered across sign-out so the picker can highlight your name.
  res.cookies.set(LAST_NAME_COOKIE, user.displayName, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}

const renameSchema = z.object({ name: z.string().trim().min(1).max(40) });

// Rename your own display name. Reflects everywhere your name shows.
export async function PATCH(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = renameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid name' }, { status: 400 });
  const name = parsed.data.name;

  const all = await db.select({ id: users.id, displayName: users.displayName }).from(users);
  if (all.find((u) => u.id !== userId && u.displayName.toLowerCase() === name.toLowerCase()))
    return NextResponse.json({ error: 'name taken' }, { status: 409 });

  const [updated] = await db
    .update(users)
    .set({ displayName: name })
    .where(eq(users.id, userId))
    .returning();
  const res = NextResponse.json({ user: { id: updated.id, displayName: updated.displayName } });
  res.cookies.set(LAST_NAME_COOKIE, updated.displayName, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}

// Sign out / switch player. Keeps the remembered name on purpose.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' });
  return res;
}
