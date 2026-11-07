"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, database, googleProvider, ref, get, set, update, onValue } from "./firebase";
import { UserProfile, UserRole } from "@printmart/shared";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signInWithGoogle: async () => { },
  signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);

        // Check if user is in /admins node
        const adminRef = ref(database, `admins/${fbUser.uid}`);
        get(adminRef)
          .then((snapshot) => {
            setIsAdmin(snapshot.exists() && snapshot.val()?.enabled === true);
          })
          .catch(() => setIsAdmin(false));

        // Read or initialize user profile in RTDB
        const userRef = ref(database, `users/${fbUser.uid}`);
        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            setProfile(snapshot.val());
            // Update lastLoginAt
            update(userRef, { lastLoginAt: Date.now() });
          } else {
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || "PrintMart Customer",
              email: fbUser.email || "",
              photoURL: fbUser.photoURL || undefined,
              role: "customer",
              accountStatus: "active",
              stats: {
                totalDocuments: 0,
                totalPages: 0,
                totalSpentPaise: 0,
              },
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
            };
            await set(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign in error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
