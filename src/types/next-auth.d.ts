import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      company_id: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    company_id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    company_id: string;
  }
} 