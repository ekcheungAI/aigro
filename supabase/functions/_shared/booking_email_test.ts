import { bookingSubject, renderBookingEmail } from "./booking-email.ts";

Deno.test("renders the booking notification in HTML and plain text", () => {
  const subject = bookingSubject("confirmed");
  if (subject !== "AIGRO 預約｜導師已確認預約") {
    throw new Error("wrong booking subject");
  }

  const email = renderBookingEmail({
    status: "confirmed",
    startsAt: "2026-08-14T02:00:00.000Z",
    meetingUrl: "https://meet.example/room?name=<script>",
    accountUrl: "https://aigro.io/account",
  });

  if (email.html.includes("<script>")) {
    throw new Error("meeting URL was not escaped");
  }
  if (!email.html.includes("2026年8月14日")) {
    throw new Error("Hong Kong date is missing");
  }
  if (!email.text.includes("https://meet.example/room?name=<script>")) {
    throw new Error("plain-text meeting URL is missing");
  }
  if (!email.html.includes("AIGRO")) throw new Error("brand name is missing");
});

Deno.test("renders separate role-specific booking wording", () => {
  const expert = renderBookingEmail({
    status: "requested",
    startsAt: "2026-08-14T02:00:00.000Z",
    accountUrl: "https://aigro.io/portal/bookings",
    audience: "expert",
  });
  const member = renderBookingEmail({
    status: "requested",
    startsAt: "2026-08-14T02:00:00.000Z",
    accountUrl: "https://aigro.io/account",
    audience: "member",
  });

  if (expert.subject !== "AIGRO 預約｜你有新嘅導師預約申請") {
    throw new Error("expert subject is not role-specific");
  }
  if (
    !expert.html.includes("處理預約") ||
    !expert.html.includes("/portal/bookings")
  ) {
    throw new Error("expert action is missing");
  }
  if (
    !member.html.includes("查看會員專區") || !member.html.includes("/account")
  ) {
    throw new Error("member action is missing");
  }
});
