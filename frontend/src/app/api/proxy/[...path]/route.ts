import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/auth";

function getBackendUrl(): string {
  const raw = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1"))
    return `http://${raw}`;
  return `https://${raw}`;
}

async function createBackendToken(session: { user: { email?: string | null; name?: string | null; [key: string]: unknown } }): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !session.user.email) return null;
  const secretBytes = new TextEncoder().encode(secret);
  return new SignJWT({
    email: session.user.email,
    name: session.user.name ?? null,
    role: (session.user as { role?: string }).role ?? "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2m")
    .sign(secretBytes);
}

async function proxyRequest(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ detail: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const backendUrl = getBackendUrl();
  const path = request.nextUrl.pathname.replace(/^\/api\/proxy/, "");
  const search = request.nextUrl.search;
  const targetUrl = `${backendUrl}${path}${search}`;

  // Forward headers, stripping hop-by-hop and cookie headers
  const headers = new Headers();
  const skipHeaders = new Set(["host", "cookie", "connection"]);
  request.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Add Authorization header with short-lived signed JWT
  const backendToken = await createBackendToken(session as unknown as { user: { email?: string | null; name?: string | null; [key: string]: unknown } });
  if (backendToken) {
    headers.set("Authorization", `Bearer ${backendToken}`);
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward body for non-GET/HEAD requests
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
    // @ts-expect-error - duplex is required for streaming request bodies
    fetchOptions.duplex = "half";
  }

  let upstream: Response;
  try {
    console.log(`[proxy] ${request.method} ${targetUrl}`);
    upstream = await fetch(targetUrl, fetchOptions);
    console.log(`[proxy] ${upstream.status} from ${targetUrl}`);
  } catch (err) {
    console.error(`[proxy] fetch failed for ${targetUrl}:`, err);
    return new Response(
      JSON.stringify({
        detail: `Backend unreachable: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // For streaming responses (text/plain from /createSummary), pass ReadableStream through directly
  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.startsWith("text/plain") && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-cache",
      },
    });
  }

  // For all other responses, pass through as-is
  const responseHeaders = new Headers();
  const skipResponseHeaders = new Set([
    "transfer-encoding",
    "content-encoding",
    "content-length",
  ]);
  upstream.headers.forEach((value, key) => {
    if (!skipResponseHeaders.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // 204 No Content must have a null body per the HTTP spec
  if (upstream.status === 204) {
    return new Response(null, {
      status: 204,
      headers: responseHeaders,
    });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
