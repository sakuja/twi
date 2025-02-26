const axios = require('axios');

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;

// デモデータを返す関数
function getDemoData() {
  console.log('Returning demo data instead');
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
    // 有効なトークンがあれば再利用
    if (twitchToken && tokenExpiry && Date.now() < tokenExpiry) {
      console.log('Reusing existing token');
      return twitchToken;
    }
    
    console.log('Requesting new Twitch token');
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    
    if (!response.data || !response.data.access_token) {
      throw new Error('Invalid token response');
    }
    
    console.log('Successfully obtained new token');
    twitchToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.9);
    return twitchToken;
  } catch (error) {
    console.error('Token acquisition failed:', error.message);
    throw error;
  }
}

// Twitchストリームを取得する関数
async function fetchTwitchStreams(token) {
  try {
    console.log('Fetching streams from Twitch API');
    const streamsResponse = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      params: {
        first: 100,
        language: 'ja' // 日本語配信のみをフィルタリング
      }
    });
    
    // 以下は同じ...
    
    if (!streamsResponse.data || !streamsResponse.data.data) {
      throw new Error('Invalid streams response');
    }
    
    const streams = streamsResponse.data.data;
    console.log(`Retrieved ${streams.length} streams`);
    
    if (streams.length === 0) {
      return [];
    }
    
    // ユーザー情報を取得 - 一度に最大100個までのIDを処理
    console.log('Fetching user information');
    const userIds = streams.map(stream => stream.user_id);
    
    // ユーザーIDのバッチ処理（100個ずつに分割）
    const userBatches = [];
    for (let i = 0; i < userIds.length; i += 100) {
      userBatches.push(userIds.slice(i, i + 100));
    }
    
    let allUsers = [];
    for (const batch of userBatches) {
      try {
        const usersResponse = await axios.get('https://api.twitch.tv/helix/users', {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`
          },
          params: {
            id: batch.join(',')
          }
        });
        
        if (usersResponse.data && usersResponse.data.data) {
          allUsers = [...allUsers, ...usersResponse.data.data];
        }
      } catch (error) {
        console.error('Error fetching user batch:', error.message);
        // エラーが発生しても処理を続行
      }
    }
    
    // ゲーム情報を取得 - 同様にバッチ処理
    console.log('Fetching game information');
    const gameIds = [...new Set(streams.map(stream => stream.game_id).filter(id => id))];
    
    // ゲームIDのバッチ処理
    const gameBatches = [];
    for (let i = 0; i < gameIds.length; i += 100) {
      gameBatches.push(gameIds.slice(i, i + 100));
    }
    
    let allGames = [];
    for (const batch of gameBatches) {
      if (batch.length === 0) continue;
      
      try {
        const gamesResponse = await axios.get('https://api.twitch.tv/helix/games', {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`
          },
          params: {
            id: batch.join(',')
          }
        });
        
        if (gamesResponse.data && gamesResponse.data.data) {
          allGames = [...allGames, ...gamesResponse.data.data];
        }
      } catch (error) {
        console.error('Error fetching game batch:', error.message);
        // エラーが発生しても処理を続行
      }
    }
    
    // マッピング用のオブジェクトを作成
    const usersMap = {};
    allUsers.forEach(user => {
      usersMap[user.id] = user;
    });
    
    const gamesMap = {};
    allGames.forEach(game => {
      gamesMap[game.id] = game;
    });
    
    // データを整形
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
        language: stream.language,
        thumbnail_url: user.profile_image_url || '',
        tags: stream.tags || []
      };
    });
    
    // 視聴者数でソート
    formattedStreams.sort((a, b) => b.viewer_count - a.viewer_count);
    console.log('Successfully processed stream data');
    
    return formattedStreams;
  } catch (error) {
    console.error('Error in fetchTwitchStreams:', error.message);
    throw error;
  }
}

// APIハンドラー - 重要: このエクスポートがなければエラーになります
module.exports = async (req, res) => {
  try {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('API request received');
    
    try {
      // キャッシュデータを確認
      if (cachedData && cacheTime && (Date.now() - cacheTime) < 300000) {
        console.log('Using cached data');
        return res.status(200).json(cachedData);
      }
      
      // 新しいデータを取得
      console.log('Getting fresh data from Twitch API');
      const token = await getTwitchToken();
      const streams = await fetchTwitchStreams(token);
      
      // キャッシュを更新
      cachedData = streams;
      cacheTime = Date.now();
      
      return res.status(200).json(streams);
    } catch (error) {
      console.error('Error fetching Twitch data:', error.message);
      
      // エラーログの詳細
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      
      // デモデータを返す
      return res.status(200).json(getDemoData());
    }
  } catch (error) {
    console.error('Unexpected server error:', error.message);
    return res.status(200).json(getDemoData());
  }
};
