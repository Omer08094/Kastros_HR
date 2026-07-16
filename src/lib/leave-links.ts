import { appPublicUrl } from "@/lib/app-url";

export function leaveRequestPath(requestId: string): string {
  return `/leave?request=${encodeURIComponent(requestId)}`;
}

export function leaveRequestUrl(requestId: string): string {
  return `${appPublicUrl()}${leaveRequestPath(requestId)}`;
}
