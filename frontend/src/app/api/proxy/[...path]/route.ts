import { NextRequest } from "next/server";
import { auth } from "@/auth";

function getBackendUrl(): string {
  const raw = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
  // Render's fromService property:host returns just the hostname (e.g. aias-backend.onrender.com)
  // localhost URLs use http://, everything else uses https://
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) return `http://${raw}`;
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
    // Pass raw body stream — works for both JSON and multipart/form-data
    fetchOptions.body = request.body;
    // @ts-expect-error - duplex is required for streaming request bodies
    fetchOptions.duplex = "half";
  }

  const upstream = await fetch(targetUrl, fetchOptions);

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
    // Skip hop-by-hop headers
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
