export async function GET() {
  return Response.json({
    ok: true,
    service: "qcmaster-next",
    time: new Date().toISOString(),
  });
}

