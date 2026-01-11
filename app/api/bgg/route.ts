import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  // MOCK DATA FOR TESTING
  if (username.toLowerCase() === 'mock') {
      const mockXml = `
<items totalitems="2" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse" pubdate="Sun, 11 Jan 2026 19:20:15 +0000">
<item objecttype="thing" objectid="68448" subtype="boardgame" collid="96698360">
<name sortindex="1">7 Wonders</name>
<yearpublished>2010</yearpublished>
<image>https://cf.geekdo-images.com/35h9Za_JvMMMtx_92kT0Jg__original/img/jt70jJDZ1y1FWJs4ZQf5FI8APVY=/0x0/filters:format(jpeg)/pic7149798.jpg</image>
<thumbnail>https://cf.geekdo-images.com/35h9Za_JvMMMtx_92kT0Jg__small/img/BUOso8b0M1aUOkU80FWlhE8uuxc=/fit-in/200x150/filters:strip_icc()/pic7149798.jpg</thumbnail>
<stats minplayers="2" maxplayers="7" minplaytime="30" maxplaytime="30" playingtime="30" numowned="153606">
<rating value="N/A">
<usersrated value="111315"/>
<average value="7.66526"/>
<bayesaverage value="7.55239"/>
<stddev value="1.27715"/>
<median value="0"/>
</rating>
</stats>
<status own="1" prevowned="0" fortrade="0" want="0" wanttoplay="0" wanttobuy="0" wishlist="0" preordered="0" lastmodified="2022-08-11 02:24:45"/>
<numplays>0</numplays>
</item>
<item objecttype="thing" objectid="167791" subtype="boardgame" collid="12345678">
<name sortindex="1">Terraforming Mars</name>
<yearpublished>2016</yearpublished>
<image>https://cf.geekdo-images.com/wg9oOLcsKvDesSUdZQ4rxw__original/img/LuWkeIx866vYpX8C7Yj_jJ3a464=/0x0/filters:format(jpeg)/pic3536616.jpg</image>
<thumbnail>https://cf.geekdo-images.com/wg9oOLcsKvDesSUdZQ4rxw__small/img/iC5hVbLpD08_O0L8o_jJ3a464=/fit-in/200x150/filters:strip_icc()/pic3536616.jpg</thumbnail>
<stats minplayers="1" maxplayers="5" minplaytime="120" maxplaytime="120" playingtime="120" numowned="100000">
<rating value="N/A">
<usersrated value="80000"/>
<average value="8.4"/>
<bayesaverage value="8.2"/>
<stddev value="1.1"/>
<median value="0"/>
</rating>
</stats>
<status own="1" prevowned="0" fortrade="0" want="0" wanttoplay="0" wanttobuy="0" wishlist="0" preordered="0" lastmodified="2022-08-11 02:24:45"/>
<numplays>10</numplays>
</item>
</items>
      `;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });
      const data = parser.parse(mockXml);
      const items = data.items.item;
       const games = items.map((item: any) => {
        const stats = item.stats || {};
        return {
          id: item.objectid,
          name: item.name ? (item.name['#text'] || item.name) : 'Unknown',
          thumbnail: item.thumbnail,
          minPlayers: stats.minplayers,
          maxPlayers: stats.maxplayers,
          playingTime: stats.playingtime,
        };
      });
      return NextResponse.json({ games });
  }

  const maxRetries = 6;
  const retryDelay = 3000; // 3 seconds

  for (let i = 0; i <= maxRetries; i++) {
    try {
      // Add User-Agent header as BGG API might require it
      const response = await fetch(
        `https://boardgamegeek.com/xmlapi2/collection?username=${username}&own=1&stats=1`,
        {
             headers: {
                 'User-Agent': 'BGG-Steam-Finder/1.0',
                 'Accept': 'application/xml'
             }
        }
      );

      if (response.status === 202) {
        if (i === maxRetries) {
          return NextResponse.json(
            { error: 'BGG is processing your request. Please try again later.' },
            { status: 202 }
          );
        }
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch collection from BGG. Status: ${response.status}` },
          { status: response.status }
        );
      }

      const xmlText = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });
      const data = parser.parse(xmlText);

      if (data.errors) {
           return NextResponse.json(
            { error: 'Error parsing BGG response.' },
            { status: 500 }
          );
      }

      if (!data.items) {
          return NextResponse.json({ games: [] });
      }

      let items = data.items.item;

      if (!items) {
        return NextResponse.json({ games: [] });
      }

      if (!Array.isArray(items)) {
        items = [items];
      }

      const games = items.map((item: any) => {
        const stats = item.stats || {};

        return {
          id: item.objectid,
          name: item.name ? (item.name['#text'] || item.name) : 'Unknown',
          thumbnail: item.thumbnail,
          minPlayers: stats.minplayers,
          maxPlayers: stats.maxplayers,
          playingTime: stats.playingtime,
        };
      });

      return NextResponse.json({ games });

    } catch (error) {
      console.error('Error fetching BGG collection:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
}
