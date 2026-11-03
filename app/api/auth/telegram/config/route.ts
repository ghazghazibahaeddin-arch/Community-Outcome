import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https:') ? 'https' : 'http');
  const botUsername = process.env.TELEGRAM_BOT_NAME || 'CommunityOutcomeBot';
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  return NextResponse.json({
    success: true,
    botUsername,
    isConfigured: hasToken,
    domain: host,
    origin: `${proto}://${host}`,
    botFatherInstructions: [
      `1. Open Telegram and search for @BotFather.`,
      `2. Send /setdomain to @BotFather.`,
      `3. Select your bot: @${botUsername}.`,
      `4. Enter the domain: ${host}`,
      `5. @BotFather will respond: "Success! Domain updated."`
    ]
  });
}
