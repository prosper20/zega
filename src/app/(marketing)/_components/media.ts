export type MediaSlot = {
  id: string;
  label: string;
  src?: string;
  poster?: string;
};

export const MEDIA = {
  hero: { id: "hero", label: "ZEGA request lifecycle from report to resolution" },
  roleRequester: { id: "role-requester", label: "Student tracking a request timeline live" },
  roleOfficer: { id: "role-officer", label: "Officer work-order board on mobile" },
  roleAdmin: { id: "role-admin", label: "Administrator operations dashboard and reports" },
  ctaBackground: { id: "cta-background", label: "Maintenance officer at work on campus" },
} satisfies Record<string, MediaSlot>;
