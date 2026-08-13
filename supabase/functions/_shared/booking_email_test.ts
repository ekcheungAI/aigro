import { bookingSubject, renderBookingEmail } from "./booking-email.ts";

Deno.test("renders the booking notification in HTML and plain text", () => {
  const subject = bookingSubject("confirmed");
  if (subject !== "導師預約已確認") throw new Error("wrong booking subject");

  const email = renderBookingEmail({
    status: "confirmed",
    startsAt: "2026-08-14T02:00:00.000Z",
    meetingUrl: 'https://meet.example/room?name=<script>',
    accountUrl: "https://aigro.io/account",
  });

  if (email.html.includes("<script>")) throw new Error("meeting URL was not escaped");
  if (!email.html.includes("2026年8月14日")) throw new Error("Hong Kong date is missing");
  if (!email.text.includes("https://meet.example/room?name=<script>")) {
    throw new Error("plain-text meeting URL is missing");
  }
  if (!email.html.includes("AIGRO")) throw new Error("brand name is missing");
});
