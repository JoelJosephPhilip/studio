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
      if (session?.user && token?.email) {
        // Use email as the consistent ID in the session user object
        session.user.id = token.email;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Use email as the canonical user ID for Firestore documents
      const userEmail = user.email;

      if (account && userEmail) {
         try {
            const privateData: any = {
                accessToken: account.access_token,
                accessTokenExpires: account.expires_at,
            }
            if(account.refresh_token) {
                privateData.refreshToken = account.refresh_token
            }
            
            // Note: The document ID for 'private' data can still be the provider ID if needed,
            // but the main user document must be keyed by email.
            await setDoc(doc(db, "users", userEmail, "private", "googleAuth"), privateData, { merge: true });

            // Save public user data using the email as the document ID.
            const userDocRef = doc(db, "users", userEmail);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
              await setDoc(userDocRef, {
                uid: user.id, // Keep the original provider UID for reference if needed
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
