import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Forward to backend
  const backendRes = await fetch("http://localhost:8000/uploadTempFile", {
    method: "POST",
    body: formData,
  });
  if (!backendRes.ok) {
    return NextResponse.json({ error: "Backend upload failed" }, { status: 500 });
  }
  const data = await backendRes.json();
  return NextResponse.json(data);
}
