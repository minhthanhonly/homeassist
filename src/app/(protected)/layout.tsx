import { RouteGuard } from "@/components/auth/route-guard";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RouteGuard>{children}</RouteGuard>;
}
