import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function IntegrationsPage() {
  return (
    <ComingSoon
      icon={Plug}
      title="Integrations"
      phase="Coming soon"
      description="Google Drive/Sheets, GitHub, and Slack connections will live here — currently in beta planning. WhatsApp is already live; check its status on the Settings page. Need one of these sooner? Ask your team lead to prioritize it."
    />
  );
}
