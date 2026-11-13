import type { Metadata } from "next";

import { PageHeader } from "../../_components/page-header";
import { LocationsManager } from "./_components/locations-manager";

export const metadata: Metadata = { title: "Locations & QR" };

export default function AdminLocationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locations & QR stickers"
        description="The campus location tree. Print a QR sticker for any room: scanning it opens the report form with the room filled in."
      />
      <LocationsManager />
    </div>
  );
}
