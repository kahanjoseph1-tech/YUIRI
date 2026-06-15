import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import bcrypt from "bcryptjs";
import { User } from "./types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", credentials.email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as User;

        const isValid = await bcrypt.compare(credentials.password, userData.password);
        if (!isValid) return null;

        return {
          id: userDoc.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
