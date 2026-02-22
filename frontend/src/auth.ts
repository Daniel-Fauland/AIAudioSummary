import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function getBackendInternalUrl(): string {
  const raw = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) return `http://${raw}`;
  return `https://${raw}`;
}

async function verifyEmailAccess(email: string): Promise<{ allowed: boolean; name?: string; role?: string }> {
  try {
    const url = `${getBackendInternalUrl()}/auth/verify?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { allowed: false };
    return res.json();
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
