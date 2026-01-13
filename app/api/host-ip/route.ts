import os from "os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const isPrivateIpv4 = (ip: string) =>
  ip.startsWith("10.") ||
  ip.startsWith("192.168.") ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

export async function GET() {
  const nets = os.networkInterfaces();
  const candidates: string[] = [];

  Object.values(nets).forEach((entries) => {
    entries?.forEach((entry) => {
      if (entry.family === "IPv4" && !entry.internal) {
        candidates.push(entry.address);
      }
    });
  });

  const ip = candidates.find(isPrivateIpv4) || candidates[0] || "";
  return NextResponse.json({ ip });
}
