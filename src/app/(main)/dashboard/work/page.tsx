import { Wrench } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "My work orders | ZEGA" };

export default function WorkPage() {
  return (
    <Placeholder
      title="My work orders"
      description="Jobs assigned to you, most urgent first."
      icon={Wrench}
      message="Jobs assigned to you will appear here."
    />
  );
}
