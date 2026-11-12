"use client";

import { adminClient, inferAdditionalFields, jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/server/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), adminClient(), jwtClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
