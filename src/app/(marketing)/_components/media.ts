/**
 * Landing-page video slots (MaintainX-style autoplaying product loops).
 * Each slot renders an animated product mock until a recording exists.
 * After seeding, `npm run record:demo` (Playwright) writes MP4/WebM files to /public/videos;
 * set `src` here to switch a slot from the mock to the real recording.
 */
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
