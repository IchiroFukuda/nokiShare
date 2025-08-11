import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "../../../../lib/supabase";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          // セキュリティ上の理由で、詳細なエラー情報は返さない
          return null;
        }

        try {
          // ユーザーをデータベースから取得
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single();

          if (error) {
            // データベースエラーの場合も詳細情報は返さない
            console.error('Database error during authentication:', error);
            return null;
          }

          if (!user) {
            // ユーザーが存在しない場合も詳細情報は返さない
            return null;
          }

          // メール確認が完了しているかチェック
          if (!user.email_verified) {
            // メール確認未完了の場合も詳細情報は返さない
            return null;
          }

          // パスワードを比較
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            // パスワードが間違っている場合も詳細情報は返さない
            return null;
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            company_id: user.company_id,
          };
        } catch (error) {
          console.error('Unexpected error during authentication:', error);
          // 予期しないエラーの場合も詳細情報は返さない
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.company_id = user.company_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.company_id = token.company_id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST }; 
