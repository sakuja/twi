const axios = require('axios');

// APIハンドラー
module.exports = async (req, res) => {
  try {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('API request received');
    console.log('Checking environment variables...');
    
    // 環境変数のチェック
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      console.error('Missing Twitch API credentials in environment variables');
      return res.status(200).json(getDemoData());
    }
    
    console.log('Environment variables found, attempting to get Twitch token...');
    
    try {
      // トークン取得テスト
      const token = await getTwitchToken();
      console.log('Successfully obtained Twitch token');
      
      // 実際のデータ取得
      console.log('Fetching Twitch stream data...');
      const data = await fetchTwitchData(token);
      console.log(`Successfully fetched ${data.length} streams`);
      
      return res.status(200).json(data);
    } catch (apiError) {
      console.error('Twitch API error:', apiError.message);
      // エラーの詳細を記録
      if (apiError.response) {
        console.error('API response:', apiError.response.data);
        console.error('Status code:', apiError.response.status);
      }
      
      // エラーが発生した場合はデモデータを返す
      return res.status(200).json(getDemoData());
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// デモデータを返す関数
function getDemoData() {
  console.log('Returning demo data');
  return [
    { user_name: "ストリーマー1", user_login: "streamer1", viewer_count: 45000, game_name: "フォートナイト", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー2", user_login: "streamer2", viewer_count: 38000, game_name: "Apex Legends", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー3", user_login: "streamer3", viewer_count: 32000, game_name: "Minecraft", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー4", user_login: "streamer4", viewer_count: 25000, game_name: "リーグ・オブ・レジェンド", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー5", user_login: "streamer5", viewer_count: 20000, game_name: "大乱闘スマッシュブラザーズ", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー6", user_login: "streamer6", viewer_count: 18000, game_name: "Valorant", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー7", user_login: "streamer7", viewer_count: 15000, game_name: "原神", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー8", user_login: "streamer8", viewer_count: 12000, game_name: "ポケットモンスター", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー9", user_login: "streamer9", viewer_count: 10000, game_name: "Among Us", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー10", user_login: "streamer10", viewer_count: 9000, game_name: "Call of Duty", thumbnail_url: "https://via.placeholder.com/40" },
  ];
}

// Twitchの認証トークンを取得する関数
async function getTwitchToken() {
  try {
    console.log('Requesting Twitch token with client ID:', process.env.TWITCH_CLIENT_ID.substring(0, 5) + '...');
    
    // Twitchの認証APIにリクエスト
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    
    if (!response.data || !response.data.access_token) {
      throw new Error('Invalid response from Twitch token endpoint');
    }
    
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get Twitch token:', error.message);
    throw error;
  }
}

// Twitchデータを取得する関数
async function fetchTwitchData(token) {
  try {
    // Twitch APIにリクエスト（トップストリームを取得）
    const streamsResponse = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      params: {
        first: 100 // 最大100件のストリームを取得
      }
    });
    
    if (!streamsResponse.data || !streamsResponse.data.data) {
      throw new Error('Invalid response from Twitch streams endpoint');
    }
    
    const streams = streamsResponse.data.data;
    console.log(`Retrieved ${streams.length} streams from Twitch API`);
    
    if (streams.length === 0) {
      return [];
    }
    
    // ユーザー情報とゲーム情報を取得するためのIDを集める
    const userIds = streams.map(stream => stream.user_id);
    const gameIds = [...new Set(streams.map(stream => stream.game_id).filter(id => id))];
    
    console.log(`Fetching user data for ${userIds.length} users`);
    // ユーザー情報を取得
    const usersResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      params: {
        id: userIds.join(',')
      }
    });
    
    // ゲーム情報を取得
    let gamesData = [];
    if (gameIds.length > 0) {
      console.log(`Fetching game data for ${gameIds.length} games`);
      const gamesResponse = await axios.get('https://api.twitch.tv/helix/games', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params: {
          id: gameIds.join(',')
        }
      });
      gamesData = gamesResponse.data.data || [];
    }
    
    // ユーザーデータをマップ
    const usersMap = {};
    if (usersResponse.data && usersResponse.data.data) {
      usersResponse.data.data.forEach(user => {
        usersMap[user.id] = user;
      });
    }
    
    // ゲームデータをマップ
    const gamesMap = {};
    gamesData.forEach(game => {
      gamesMap[game.id] = game;
    });
    
    // ストリームデータを整形
    const formattedStreams = streams.map(stream => {
      const user = usersMap[stream.user_id] || {};
      const game = gamesMap[stream.game_id] || {};
      
      return {
        id: stream.id,
        user_id: stream.user_id,
        user_name: stream.user_name,
        user_login: stream.user_login,
        game_id: stream.game_id,
        game_name: game.name || 'Unknown Game',
        title: stream.title,
        viewer_count: stream.viewer_count,
        started_at: stream.started_at,
        language: stream.language,
        thumbnail_url: user.profile_image_url || '',
        tags: stream.tags || []
      };
    });
    
    // 視聴者数でソート
    formattedStreams.sort((a, b) => b.viewer_count - a.viewer_count);
    
    return formattedStreams;
  } catch (error) {
    console.error('Error in fetchTwitchData:', error.message);
    throw error;
  }
}
