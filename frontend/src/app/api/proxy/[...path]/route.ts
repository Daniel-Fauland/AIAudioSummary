import { NextRequest } from "next/server";
import { auth } from "@/auth";

function getBackendUrl(): string {
  const raw = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1"))
    return `http://${raw}`;
  return `https://${raw}`;
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
  const body = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      responseHeaders.set(key, value);
    }
  });

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
