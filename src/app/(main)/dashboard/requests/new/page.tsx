import { PlusCircle } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Report an issue | ZEGA" };

export default function NewRequestPage() {
  return (
    <Placeholder
      title="Report an issue"
      description="Tell us what is wrong and where."
      icon={PlusCircle}
      message="The guided report form will appear here."
    />
  );
}
