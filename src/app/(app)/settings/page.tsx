import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isEmailConfigured } from "@/lib/email";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/dashboard");

  const [ws] = await db.select().from(workspaces).limit(1);

  const status = {
    aiProvider: process.env.AI_PROVIDER || "huggingface",
    aiConfigured: process.env.AI_PROVIDER === "groq" ? !!process.env.GROQ_API_KEY : !!process.env.HF_TOKEN,
    whatsappConfigured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    emailConfigured: isEmailConfigured(),
  };

  return (
    <SettingsClient
      workspace={ws ?? { name: "R&D Command Center", timezone: "Asia/Kolkata" }}
      isAdmin={session?.role === "admin"}
      status={status}
    />
  );
}
