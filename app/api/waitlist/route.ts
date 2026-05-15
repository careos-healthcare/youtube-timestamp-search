import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_INTERESTS = new Set([
  "waitlist",
  "chrome_extension",
  "api_access",
  "save_searches",
  "weekly_digest",
]);

function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; interest?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const interest = body.interest?.trim() ?? "waitlist";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!ALLOWED_INTERESTS.has(interest)) {
      return NextResponse.json({ error: "Invalid interest type." }, { status: 400 });
    }

    console.log(
      JSON.stringify({
        type: "waitlist_signup",
        email,
        interest,
        source: "youtubetimesearch.com",
        createdAt: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      message: "You're on the list.",
    });
  } catch {
    return NextResponse.json({ error: "Could not save your email. Try again." }, { status: 500 });
  }
}
