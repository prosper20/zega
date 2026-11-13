import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

const C = { blue: "#246cff", navy: "#001e40", grey: "#4c6177", bg: "#f4f9fd", line: "#e5e8ec" };

/** One branded layout for every ZEGA email. */
export function NotificationEmail({
  heading,
  body,
  refCode,
  title,
  ctaLabel,
  ctaUrl,
  recipientName,
}: {
  heading: string;
  body: string;
  refCode?: string | null;
  title?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  recipientName: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{heading}</Preview>
      <Body
        style={{
          backgroundColor: C.bg,
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            border: `1px solid ${C.line}`,
            maxWidth: 520,
            padding: 32,
          }}
        >
          <Text style={{ color: C.blue, fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0 }}>ZEGA</Text>
          <Heading as="h1" style={{ color: C.navy, fontSize: 20, margin: "20px 0 8px" }}>
            {heading}
          </Heading>
          <Text style={{ color: C.navy, fontSize: 15, lineHeight: "24px" }}>Hi {recipientName.split(" ")[0]},</Text>
          <Text style={{ color: C.navy, fontSize: 15, lineHeight: "24px" }}>{body}</Text>
          {refCode && (
            <Section style={{ backgroundColor: C.bg, borderRadius: 8, padding: "12px 16px", margin: "16px 0" }}>
              <Text style={{ color: C.grey, fontSize: 12, margin: 0 }}>{refCode}</Text>
              {title && (
                <Text style={{ color: C.navy, fontSize: 15, fontWeight: 600, margin: "4px 0 0" }}>{title}</Text>
              )}
            </Section>
          )}
          <Button
            href={ctaUrl}
            style={{
              backgroundColor: C.blue,
              borderRadius: 8,
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              padding: "12px 20px",
            }}
          >
            {ctaLabel}
          </Button>
          <Hr style={{ borderColor: C.line, margin: "28px 0 16px" }} />
          <Text style={{ color: C.grey, fontSize: 12, lineHeight: "18px", margin: 0 }}>
            You are receiving this because you are involved in this request on ZEGA. You can turn off email
            notifications on your profile page.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
