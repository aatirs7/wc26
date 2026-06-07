import { clerkMiddleware } from '@clerk/nextjs/server';

// Routes stay public by default; server code gates writes and private
// reads via auth() and the helpers in lib/access.ts.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
