// ... existing code ...

// ストリームデータを取得する関数
async function fetchTwitchStreams(token) {
  console.log('Fetching streams from Twitch API');
  
  try {
    // 日本語のストリームを取得
    const response = await axios.get(
      'https://api.twitch.tv/helix/streams',
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params: {
          language: 'ja',
          first: 100
        }
      }
    );

    if (!response.data || !response.data.data) {
      throw new Error(`Twitch API error: Invalid response`);
    }

    const streams = response.data.data;
    console.log(`Fetched ${streams.length} streams`);
    
    // サンプルストリームのフィールドをログに出力
    if (streams && streams.length > 0) {
      console.log('Sample stream data fields:', Object.keys(streams[0]));
    }

    // ユーザー情報を取得するためのユーザーIDを収集
    const userIds = streams.map(stream => stream.user_id);
    
    // ユーザー情報を取得
    const usersResponse = await axios.get(
      'https://api.twitch.tv/helix/users',
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params: {
          id: userIds.join('&id=')
        }
      }
    );

    if (!usersResponse.data || !usersResponse.data.data) {
      throw new Error(`Twitch Users API error: Invalid response`);
    }

    const users = usersResponse.data.data;
    
    // ユーザー情報をマップ
    const usersMap = {};
    users.forEach(user => {
      usersMap[user.id] = user;
    });
    
    // ストリーム情報とユーザー情報を結合
    const formattedStreams = streams.map(stream => {
      const user = usersMap[stream.user_id] || {};
      
      return {
        id: stream.id,
        user_id: stream.user_id,
        user_name: stream.user_name,
        user_login: stream.user_login,
        title: stream.title,
        viewer_count: stream.viewer_count,
        started_at: stream.started_at,
        profile_image_url: user.profile_image_url || PLACEHOLDER_IMAGE_URL(stream.user_name),
        thumbnail_url: stream.thumbnail_url?.replace('{width}', '40').replace('{height}', '40') || PLACEHOLDER_IMAGE_URL(stream.user_name),
        language: stream.language,
        game_name: stream.game_name,
        stream_duration: calculateDuration(stream.started_at)
      };
    });
    
    // 最初のフォーマット済みストリームをログに出力
    if (formattedStreams.length > 0) {
      console.log('First formatted stream:', {
        user_name: formattedStreams[0].user_name,
        started_at: formattedStreams[0].started_at,
        profile_image_url: formattedStreams[0].profile_image_url,
        stream_duration: formattedStreams[0].stream_duration
      });
    }
    
    return formattedStreams;
  } catch (error) {
    console.error('Error fetching Twitch streams:', error);
    return [];
  }
}

// ... existing code ...

// APIハンドラー
module.exports = async (req, res) => {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('API request received');
    try {
        // キャッシュを一時的に無効化（デバッグのため）
        // if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_EXPIRATION_MS) {
        //     console.log('Using cached data');
        //     return res.status(200).json(cachedData);
        // }

        // 新しいデータを取得
        console.log('Getting fresh data from Twitch API');
        const token = await getTwitchToken();
        const streams = await fetchTwitchStreams(token);
        
        // processStreams関数を使用しない
        // const processedStreams = await processStreams(streams, token);

        // キャッシュを更新
        cachedData = streams;
        cacheTime = Date.now();

        return res.status(200).json(streams);

    } catch (error) {
        console.error('Error:', error.message, error.statusCode);
        if (error instanceof TwitchAPIError) {
            return res.status(error.statusCode).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
// ... existing code ...
