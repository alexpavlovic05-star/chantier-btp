import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chantiers/:path*",
    "/planning/:path*",
    "/timesheets/:path*",
    "/team/:path*",
    "/my-planning/:path*",
    "/my-timesheets/:path*",
  ],
};
