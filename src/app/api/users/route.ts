export async function GET() {
  return Response.json({
    items: [
      { id: "u_1", name: "Nguyễn Văn A", email: "a@example.com" },
      { id: "u_2", name: "Trần Thị B", email: "b@example.com" },
      { id: "u_3", name: "Lê Văn C", email: "c@example.com" },
    ],
    total: 3,
  });
}

