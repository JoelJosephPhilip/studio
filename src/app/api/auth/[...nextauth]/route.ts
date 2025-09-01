import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "https://www.googleapis.com/auth/drive.file"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && user.id) {
         try {
            await setDoc(doc(db, "users", user.id, "private", "googleAuth"), {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                accessTokenExpires: account.expires_at,
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
})

export { handler as GET, handler as POST }