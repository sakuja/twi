const axios = require('axios');

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分間のキャッシュ

// デモデータを返す関数
function getDemoData() {
  console.log('Returning demo data');
  return [
    { id: "demo1", user_id: "1", user_name: "ストリーマー1", user_login: "streamer1", viewer_count: 45000, game_name: "フォートナイト", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo2", user_id: "2", user_name: "ストリーマー2", user_login: "streamer2", viewer_count: 38000, game_name: "Apex Legends", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo3", user_id: "3", user_name: "ストリーマー3", user_login: "streamer3", viewer_count: 32000, game_name: "Minecraft", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo4", user_id: "4", user_name: "ストリーマー4", user_login: "streamer4", viewer_count: 25000, game_name: "リーグ・オブ・レジェンド", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo5", user_id: "5", user_name: "ストリーマー5", user_login: "streamer5", viewer_count: 20000, game_name: "大乱闘スマッシュブラザーズ", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo6", user_id: "6", user_name: "ストリーマー6", user_login: "streamer6", viewer_count: 18000, game_name: "Valorant", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo7", user_id: "7", user_name: "ストリーマー7", user_login: "streamer7", viewer_count: 15000, game_name: "原神", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo8", user_id: "8", user_name: "ストリーマー8", user_login: "streamer8", viewer_count: 12000, game_name: "ポケットモンスター", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo9", user_id: "9", user_name: "ストリーマー9", user_login: "streamer9", viewer_count: 10000, game_name: "Among Us", profile_image_url: "https://via.placeholder.com/40" },
    { id: "demo10", user_id: "10", user_name: "ストリーマー10", user_login: "streamer10", viewer_count: 9000, game_name: "Call of Duty", profile_image_url: "https://via.placeholder.com/40" },
  ];
}

// 環境変数の検証
function validateEnvironmentVars() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new Error('Missing required environment variables: TWITCH_CLIENT_ID and/or TWITCH_CLIENT_SECRET');
  }
}

// Twitchの認証トークンを取得する関数
async function getTwitchToken() {
  try {
    validateEnvironmentVars();
    
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
    // トークンの有効期限を90%に設定（早めに更新）
    tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.9);
    return twitchToken;
  } catch (error) {
    console.error('Token acquisition failed:', error.message);
    throw error;
  }
}

// バッチでデータを取得するヘルパー関数
async function fetchBatchData(url, token, batchParam, batchItems, extraParams = {}) {
  // 空の配列の場合は早期リターン
  if (!batchItems || batchItems.length === 0) {
    console.log(`No items to fetch from ${url}`);
    return [];
  }
  
  // バッチ処理用の配列を作成（最大100アイテム）
  const batches = [];
  for (let i = 0; i < batchItems.length; i += 100) {
    batches.push(batchItems.slice(i, i + 100));
  }
  
  let allResults = [];
  for (const batch of batches) {
    try {
      const params = {
        ...extraParams,
        [batchParam]: batch.join(',')
      };
      
      const response = await axios.get(url, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        allResults = [...allResults, ...response.data.data];
      } else {
        console.warn(`Response from ${url} does not contain array data:`, response.data);
      }
    } catch (error) {
      console.error(`Error fetching batch from ${url}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
    }
  }
  
  return allResults;
}

// ページネーションを含めてTwitchストリームを取得する関数
async function fetchTwitchStreams(token, maxStreams = 100) {
  try {
    console.log('Fetching streams from Twitch API');
    let allStreams = [];
    let cursor = null;
    
    // 最大ストリーム数に達するか、ページネーションが終了するまで取得
    while (allStreams.length < maxStreams) {
      const params = {
        first: 100  // 一度に取得する最大数
      };
      
      if (cursor) {
        params.after = cursor;
      }
      
      const streamsResponse = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params
      });
      
      if (!streamsResponse.data || !streamsResponse.data.data) {
        throw new Error('Invalid streams response');
      }
      
      const streams = streamsResponse.data.data;
      allStreams = [...allStreams, ...streams];
      
      // 次のページがあるか確認
      if (streamsResponse.data.pagination && streamsResponse.data.pagination.cursor) {
        cursor = streamsResponse.data.pagination.cursor;
      } else {
        break; // これ以上のデータがない
      }
      
      // 指定された最大数に達したらループを終了
      if (allStreams.length >= maxStreams) {
        allStreams = allStreams.slice(0, maxStreams);
        break;
      }
    }
    
    console.log(`Retrieved ${allStreams.length} streams in total`);
    
    // 日本語ストリームをフィルタリング
    const japaneseStreams = allStreams.filter(stream => stream.language === 'ja');
    console.log(`Filtered to ${japaneseStreams.length} Japanese streams`);
    
    if (japaneseStreams.length === 0) {
      // 日本語ストリームがない場合は全ストリームを使用
      console.log('No Japanese streams found, using all streams');
      return await processStreams(allStreams, token);
    }
    
    return await processStreams(japaneseStreams, token);
  } catch (error) {
    console.error('Error in fetchTwitchStreams:', error.message);
    throw error;
  }
}

// ゲーム情報を取得する関数
async function fetchGames(gameIds, token) {
  console.log('Fetching game information');
  return await fetchBatchData(
    'https://api.twitch.tv/helix/games',
    token,
    'id',
    gameIds
  );
}

// ストリーム情報を処理する関数
async function processStreams(streams, token) {
  if (streams.length === 0) {
    return [];
  }
  
  // ユーザーIDを抽出
  const userIds = streams.map(stream => stream.user_id);
  
  // ユーザー情報をバッチで一度に取得
  console.log('Fetching user information');
  const allUsers = await fetchBatchData(
    'https://api.twitch.tv/helix/users',
    token,
    'id',
    userIds
  );
  
  // チャンネル情報をバッチで一度に取得
  console.log('Fetching channel information');
  const allChannels = await fetchBatchData(
    'https://api.twitch.tv/helix/channels',
    token,
    'broadcaster_id',
    userIds
  );
  
  // ゲームIDを抽出（重複を除去）
  const gameIds = [...new Set(streams.filter(stream => stream.game_id).map(stream => stream.game_id))];
  
  // ゲーム情報を取得
  const allGames = await fetchGames(gameIds, token);
  
  // マッピング用のオブジェクトを作成
  const usersMap = {};
  if (Array.isArray(allUsers)) {
    allUsers.forEach(user => {
      if (user && user.id) {
        usersMap[user.id] = user;
      }
    });
  } else {
    console.warn('allUsers is not an array:', allUsers);
  }
  
  const channelsMap = {};
  if (Array.isArray(allChannels)) {
    allChannels.forEach(channel => {
      if (channel && channel.broadcaster_id) {
        channelsMap[channel.broadcaster_id] = channel;
      }
    });
  } else {
    console.warn('allChannels is not an array:', allChannels);
  }
  
  const gamesMap = {};
  if (Array.isArray(allGames)) {
    allGames.forEach(game => {
      if (game && game.id) {
        gamesMap[game.id] = game;
      }
    });
  } else {
    console.warn('allGames is not an array:', allGames);
  }
  
  // データを整形
  const formattedStreams = streams.map(stream => {
    const user = usersMap[stream.user_id] || {};
    const channel = channelsMap[stream.user_id] || {};
    const game = gamesMap[stream.game_id] || {};
    
    // プロフィール画像URL
    const profileImageUrl = user.profile_image_url || 
      `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${stream.user_name.charAt(0).toUpperCase()}`;
    
    return {
      id: stream.id,
      user_id: stream.user_id,
      user_name: stream.user_name,
      user_login: stream.user_login,
      game_id: stream.game_id,
      game_name: game.name || stream.game_name || 'Unknown Game',
      title: stream.title,
      viewer_count: stream.viewer_count,
      language: stream.language,
      profile_image_url: profileImageUrl,
      tags: stream.tags || []
    };
  });
  
  // 視聴者数でソート
  formattedStreams.sort((a, b) => b.viewer_count - a.viewer_count);
  console.log('Successfully processed stream data');
  
  return formattedStreams;
}

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
    // 環境変数の検証
    validateEnvironmentVars();
    
    // キャッシュデータを確認
    if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
      console.log('Using cached data');
      return res.status(200).json({
        source: 'cache',
        data: cachedData
      });
    }
    
    // 新しいデータを取得
    console.log('Getting fresh data from Twitch API');
    const token = await getTwitchToken();
    const streams = await fetchTwitchStreams(token);
    
    // キャッシュを更新
    cachedData = streams;
    cacheTime = Date.now();
    
    return res.status(200).json({
      source: 'api',
      data: streams
    });
  } catch (error) {
    console.error('Error processing request:', error.message);
    
    // 環境変数エラーの場合
    if (error.message.includes('Missing required environment variables')) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API credentials not properly configured'
      });
    }
    
    // Twitch API関連のエラー
    if (error.response) {
      return res.status(502).json({
        error: 'Twitch API error',
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: getDemoData()
      });
    }
    
    // その他のエラー
    return res.status(500).json({
      error: 'Server error',
      message: error.message,
      data: getDemoData()
    });
  }
};
