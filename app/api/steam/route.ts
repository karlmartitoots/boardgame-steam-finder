import { NextRequest, NextResponse } from 'next/server';
import { UnifiedGame } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const steamIdInput = searchParams.get('steamId');

  if (!steamIdInput) {
    return NextResponse.json(
      { error: 'Steam ID or Vanity URL is required' },
      { status: 400 }
    );
  }

  // MOCK MODE
  if (steamIdInput === 'mock') {
    const mockGames: UnifiedGame[] = [
      {
        id: '10',
        name: 'Counter-Strike',
        thumbnail: 'https://media.steampowered.com/steamcommunity/public/images/apps/10/6b0312cda02f5f777efa2f3318c307ff9acafbb5.jpg',
        playtimeHours: 500.5,
        source: 'steam'
      },
      {
        id: '413150',
        name: 'Stardew Valley',
        thumbnail: 'https://media.steampowered.com/steamcommunity/public/images/apps/413150/687a4128dfd9876d750a9df03d4957e28424a919.jpg',
        playtimeHours: 120,
        source: 'steam'
      },
       {
        id: '271590',
        name: 'Grand Theft Auto V',
        thumbnail: 'https://media.steampowered.com/steamcommunity/public/images/apps/271590/0ec5956947b52f6b86a8a3857d9036a655255474.jpg',
        playtimeHours: 50,
        source: 'steam'
      }
    ];
    return NextResponse.json({ games: mockGames });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
      console.error("STEAM_API_KEY is not set");
       return NextResponse.json(
      { error: 'Server misconfiguration: API Key missing' },
      { status: 500 }
    );
  }

  let finalSteamId = steamIdInput;

  // Vanity URL Check (Simple heuristic: 17 digits is likely a SteamID64)
  const isSteamId64 = /^\d{17}$/.test(steamIdInput);

  if (!isSteamId64) {
    try {
      const resolveUrl = `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey}&vanityurl=${steamIdInput}`;
      const resolveRes = await fetch(resolveUrl);
      const resolveData = await resolveRes.json();

      if (resolveData.response && resolveData.response.success === 1) {
        finalSteamId = resolveData.response.steamid;
      } else {
        return NextResponse.json(
          { error: 'Steam Username not found' },
          { status: 404 }
        );
      }
    } catch (error) {
       console.error("Vanity URL resolution failed", error);
       return NextResponse.json(
          { error: 'Failed to resolve Steam username' },
          { status: 500 }
        );
    }
  }

  try {
    const gamesUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${finalSteamId}&include_appinfo=true&format=json`;
    const gamesRes = await fetch(gamesUrl);

    if (!gamesRes.ok) {
         return NextResponse.json(
          { error: `Steam API Error: ${gamesRes.status}` },
          { status: gamesRes.status }
        );
    }

    const gamesData = await gamesRes.json();

    // Check for empty object or missing games array (indicates private profile or no games)
    if (!gamesData.response || !gamesData.response.games) {
         return NextResponse.json(
          { error: "Profile is private or ID is invalid. Ensure your 'Game Details' are set to Public in Steam settings." },
          { status: 403 }
        );
    }

    const games: UnifiedGame[] = gamesData.response.games.map((game: any) => ({
      id: game.appid.toString(),
      name: game.name,
      thumbnail: `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
      playtimeHours: game.playtime_forever ? Math.round((game.playtime_forever / 60) * 10) / 10 : 0,
      source: 'steam'
    }));

    return NextResponse.json({ games });

  } catch (error) {
    console.error("Steam API Error", error);
    return NextResponse.json(
      { error: 'Internal Server Error fetching Steam games' },
      { status: 500 }
    );
  }
}
