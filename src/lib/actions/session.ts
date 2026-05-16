"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_COOKIE, sign } from "@/lib/auth";

const ONE_WEEK_S = 60 * 60 * 24 * 7;

export async function setDemoSession(userId: string): Promise<void> {
  const signed = sign(userId);
  const store = await cookies();
  store.set(DEMO_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK_S,
  });
  revalidatePath("/", "layout");
}

export async function clearDemoSession(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  revalidatePath("/", "layout");
}
