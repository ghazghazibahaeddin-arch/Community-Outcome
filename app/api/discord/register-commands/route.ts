import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const appId = process.env.DISCORD_APPLICATION_ID;

    if (!token || !appId) {
      return NextResponse.json({
        success: false,
        error: 'DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID is not configured in server environment.'
      }, { status: 400 });
    }

    const commands = [
      {
        name: 'help',
        description: 'View Community OS commands and usage guide'
      },
      {
        name: 'hub',
        description: 'Get direct link to Community Action Hub'
      },
      {
        name: 'requests',
        description: 'List active NeedSignal help requests'
      },
      {
        name: 'help-request',
        description: 'Submit a new structured assistance request',
        options: [
          {
            name: 'title',
            description: 'Brief title of the assistance requested',
            type: 3, // STRING
            required: true
          },
          {
            name: 'priority',
            description: 'Urgency level (low, medium, high, urgent)',
            type: 3,
            required: false,
            choices: [
              { name: 'Low', value: 'low' },
              { name: 'Medium', value: 'medium' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            ]
          }
        ]
      },
      {
        name: 'tasks',
        description: 'Browse active QuestLoop tasks and deliverables'
      },
      {
        name: 'mytasks',
        description: 'View tasks assigned to your verified account'
      },
      {
        name: 'passport',
        description: 'View your verified Member Passport and skills'
      },
      {
        name: 'contribution',
        description: 'Submit evidence for a completed community task'
      },
      {
        name: 'connect',
        description: 'Link your Discord account to your Community OS identity'
      },
      {
        name: 'status',
        description: 'Check Community OS Gateway and database connectivity'
      }
    ];

    const discordUrl = `https://discord.com/api/v10/applications/${appId.trim()}/commands`;
    const res = await fetch(discordUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${token.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CommunityOS/1.0 (https://community-os.org)'
      },
      body: JSON.stringify(commands)
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({
        success: false,
        status: res.status,
        error: data.message || 'Discord API rejected command registration',
        details: data
      }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully registered ${commands.length} slash commands with Discord API.`,
      registeredCount: Array.isArray(data) ? data.length : commands.length,
      commands: data
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
