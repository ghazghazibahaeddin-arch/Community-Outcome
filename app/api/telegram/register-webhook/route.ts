import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN is not configured in server environment.'
      }, { status: 400 });
    }

    const appUrl = (process.env.APP_URL || 'https://community-os.org').replace(/\/$/, '');
    const webhookUrl = `${appUrl}/api/telegram/webhook`;

    const setWebhookUrl = `https://api.telegram.org/bot${token.trim()}/setWebhook`;
    const payload: any = {
      url: webhookUrl,
      allowed_updates: ['message', 'channel_post', 'callback_query']
    };

    if (secret) {
      // Telegram requires: Only characters A-Z, a-z, 0-9, _ and - are allowed.
      const safeSecret = secret.trim().replace(/[^A-Za-z0-9_-]/g, '');
      if (safeSecret.length >= 1) {
        payload.secret_token = safeSecret;
      }
    }

    const apiRes = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await apiRes.json();
    if (!apiRes.ok || !data.ok) {
      return NextResponse.json({
        success: false,
        error: data.description || 'Telegram setWebhook failed',
        details: data
      }, { status: apiRes.status });
    }

    // Also register commands in Telegram menu
    const commands = [
      { command: 'help', description: 'Show all available commands' },
      { command: 'hub', description: 'Open Community Action Hub' },
      { command: 'requests', description: 'View active NeedSignal help requests' },
      { command: 'tasks', description: 'Browse active QuestLoop tasks' },
      { command: 'mytasks', description: 'View tasks assigned to you' },
      { command: 'passport', description: 'View verified Member Passport' },
      { command: 'contribution', description: 'Submit deliverable evidence' },
      { command: 'connect', description: 'Link Telegram account to Community OS' },
      { command: 'status', description: 'Check bot and database health' }
    ];

    await fetch(`https://api.telegram.org/bot${token.trim()}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });

    return NextResponse.json({
      success: true,
      message: 'Telegram webhook and menu commands successfully registered.',
      webhookUrl,
      telegramResponse: data
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
