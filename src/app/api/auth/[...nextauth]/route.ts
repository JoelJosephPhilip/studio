import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account && user.id) {
         try {
            await setDoc(doc(db, "users", user.id, "private", "googleAuth"), {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                accessTokenExpires: account.expires_at,
            }, { merge: true });

            // Also save public user data
            await setDoc(doc(db, "users", user.id), {
              uid: user.id,
              email: user.email,
              displayName: user.name,
              photoURL: user.image,
              createdAt: new Date(),
            }, { merge: true });

         } catch(error) {
            console.error("Error saving google auth tokens:", error)
            return false
         }
      }
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
