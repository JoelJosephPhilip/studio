import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

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
            const privateData: any = {
                accessToken: account.access_token,
                accessTokenExpires: account.expires_at,
            }
            if(account.refresh_token) {
                privateData.refreshToken = account.refresh_token
            }
            
            await setDoc(doc(db, "users", user.id, "private", "googleAuth"), privateData, { merge: true });

            // Also save public user data if it's their first time.
            const userDocRef = doc(db, "users", user.id);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
              await setDoc(userDocRef, {
                uid: user.id,
                email: user.email,
                displayName: user.name,
                photoURL: user.image,
                createdAt: new Date(),
              }, { merge: true });
            }

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
