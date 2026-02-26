import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function getBackendInternalUrl(): string {
  const raw = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) return `http://${raw}`;
  return `https://${raw}`;
}

// In-memory TTL cache for verifyEmailAccess results (5-minute window).
// Reduces backend round-trips from the jwt callback which fires on every
// token validation (multiple times per browser action).
const VERIFY_CACHE_TTL_MS = 5 * 60 * 1000;
const verifyCache = new Map<string, { result: { allowed: boolean; name?: string; role?: string }; expiresAt: number }>();

async function verifyEmailAccess(email: string): Promise<{ allowed: boolean; name?: string; role?: string }> {
  const now = Date.now();
  const cached = verifyCache.get(email);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  try {
    const url = `${getBackendInternalUrl()}/auth/verify?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { allowed: false };
    const result = await res.json();
    verifyCache.set(email, { result, expiresAt: now + VERIFY_CACHE_TTL_MS });
    return result;
  } catch {
    return { allowed: false };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Always call backend on sign-in (bypass cache) to get fresh access check
      verifyCache.delete(user.email);
      const result = await verifyEmailAccess(user.email);
      return result.allowed;
    },
    async jwt({ token, user }) {
      // Always refresh role from the DB so promotions/demotions take effect
      // without requiring a sign-out. token.email is set by Auth.js after first sign-in.
      const email = user?.email ?? (token.email as string | undefined);
      if (email) {
        const result = await verifyEmailAccess(email);
        if (result.allowed) {
          token.role = result.role ?? "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.role) {
        (session.user as { role?: string } & typeof session.user).role = token.role as string;
      }
      return session;
    },
  },
});
