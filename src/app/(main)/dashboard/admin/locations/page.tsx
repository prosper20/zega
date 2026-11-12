import { MapPin } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Locations & QR codes | ZEGA" };

export default function AdminLocationsPage() {
  return (
    <Placeholder
      title="Locations & QR codes"
      description="Campus locations and printable report-here QR stickers."
      icon={MapPin}
      message="The campus location tree will appear here."
    />
  );
}
