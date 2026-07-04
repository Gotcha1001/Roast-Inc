// "use client";

// import { createContext, useContext } from "react";
// import { Id } from "@/convex/_generated/dataModel";

// export interface UserType {
//   _id: Id<"users">;
//   _creationTime: number;
//   clerkId: string;
//   email: string;
//   name: string;
//   imageUrl?: string;
//   role: "admin" | "user";
//   createdAt: number;
// }

// export const UserContext = createContext<UserType | null>(null);

// export const useUserContext = () => {
//   const context = useContext(UserContext);
//   return context;
// };


"use client";

import { createContext, useContext } from "react";

interface User {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
  role: "admin" | "user";
  createdAt: number;
}

export const UserContext = createContext<User | null>(null);
export function useUserContext() { return useContext(UserContext); }