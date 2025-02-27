const axios = require('axios');

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分間のキャッシュ

// 安全な配列操作用ヘルパー関数
function safeArray(obj) {
  return Array.isArray(obj) ? obj : [];
}

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
  if (!batchItems || !Array.isArray(batchItems) || batchItems.length === 0) {
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
        ...extraParams
      };
      
      // batchParam が存在する場合のみ追加
      if (batch.length > 0) {
        params[batchParam] = batch.join(',');
      }
      
      const response = await axios.get(url, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params
      });
      
      // レスポンスの構造をログ出力（デバッグ用）
      console.log(`Response structure from ${url}:`, {
        hasData: !!response.data,
        dataType: response.data ? typeof response.data : 'undefined',
        hasDataArray: response.data && Array.isArray(response.data.data),
        dataArrayLength: response.data && Array.isArray(response.data.data) ? response.data.data.length : 0
      });
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        allResults = [...allResults, ...response.data.data];
      } else {
        console.warn(`Response from ${url} does not contain valid data array:`, 
          typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 200) : response.data);
      }
    } catch (error) {
      console.error(`Error fetching batch from ${url}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', 
          typeof error.response.data === 'object' ? JSON.stringify(error.response.data).substring(0, 200) : error.response.data);
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
      
      if (!streamsResponse.data) {
        throw new Error('Invalid streams response: no data');
      }
      
      // レスポンス構造をログに出力（デバッグ用）
      console.log('Streams response structure:', {
        hasData: !!streamsResponse.data,
        hasDataArray: !!streamsResponse.data && Array.isArray(streamsResponse.data.data),
        dataLength: !!streamsResponse.data && Array.isArray(streamsResponse.data.data) ? streamsResponse.data.data.length : 0
      });
      
      // data配列の存在を確認
      const streams = streamsResponse.data.data;
      if (!Array.isArray(streams)) {
        console.warn('streams is not an array:', typeof streams);
        // 配列でない場合は安全な空配列を使用
        continue;
      }
      
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
    
    if (!Array.isArray(allStreams)) {
      console.error('allStreams is not an array');
      return [];
    }
    
    // 日本語ストリームをフィルタリング
    const japaneseStreams = allStreams.filter(stream => stream && stream.language === 'ja');
    console.log(`Filtered to ${japaneseStreams.length} Japanese streams`);
    
    if (!Array.isArray(japaneseStreams) || japaneseStreams.length === 0) {
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
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    console.log('No game IDs to fetch');
    return [];
  }
  // nullやundefinedを除去
  const validGameIds = gameIds.filter(id => id != null);
  return await fetchBatchData(
    'https://api.twitch.tv/helix/games',
    token,
    'id',
    validGameIds
  );
}

// ストリーム情報を処理する関数
async function processStreams(streams, token) {
  if (!Array.isArray(streams) || streams.length === 0) {
    console.log('No streams to process');
    return [];
  }
  
  // ユーザーIDを抽出 (nullやundefinedを除去)
  const userIds = streams
    .map(stream => stream && stream.user_id)
    .filter(id => id != null);
  
  console.log(`Extracted ${userIds.length} user IDs from ${streams.length} streams`);
  
  // ユーザー情報をバッチで一度に取得
  console.log('Fetching user information');
  const allUsers = await fetchBatchData(
    'https://api.twitch.tv/helix/users',
    token,
    'id',
    userIds
  );
  
  console.log(`Retrieved ${Array.isArray(allUsers) ? allUsers.length : 0} users`);
  
  // チャンネル情報をバッチで一度に取得
  console.log('Fetching channel information');
  const allChannels = await fetchBatchData(
    'https://api.twitch.tv/helix/channels',
    token,
    'broadcaster_id',
    userIds
  );
  
  console.log(`Retrieved ${Array.isArray(allChannels) ? allChannels.length : 0} channels`);
  
  // ゲームIDを抽出（重複を除去、nullやundefinedを除去）
  const gameIds = [...new Set(
    streams
      .filter(stream => stream && stream.game_id)
      .map(stream => stream.game_id)
  )];
  
  console.log(`Extracted ${gameIds.length} unique game IDs`);
  
  // ゲーム情報を取得
  const allGames = await fetchGames(gameIds, token);
  
  console.log(`Retrieved ${Array.isArray(allGames) ? allGames.length : 0} games`);
  
  // マッピング用のオブジェクトを作成
  const usersMap = {};
  if (Array.isArray(allUsers)) {
    for (const user of allUsers) {
      if (user && user.id) {
        usersMap[user.id] = user;
      }
    }
  }
  
  const channelsMap = {};
  if (Array.isArray(allChannels)) {
    for (const channel of allChannels) {
      if (channel && channel.broadcaster_id) {
        channelsMap[channel.broadcaster_id] = channel;
      }
    }
  }
  
  const gamesMap = {};
  if (Array.isArray(allGames)) {
    for (const game of allGames) {
      if (game && game.id) {
        gamesMap[game.id] = game;
      }
    }
  }
  
  console.log(`Created maps with ${Object.keys(usersMap).length} users, ${Object.keys(channelsMap).length} channels, and ${Object.keys(gamesMap).length} games`);
  
  // データを整形
  const formattedStreams = [];
  if (Array.isArray(streams)) {
    for (const stream of streams) {
      if (!stream) continue;
      
      const user = (stream.user_id && usersMap[stream.user_id]) || {};
      const channel = (stream.user_id && channelsMap[stream.user_id]) || {};
      const game = (stream.game_id && gamesMap[stream.game_id]) || {};
      
      // プロフィール画像URL
      const profileImageUrl = user.profile_image_url || 
        `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${
          stream.user_name ? stream.user_name.charAt(0).toUpperCase() : 'U'
        }`;
      
      formattedStreams.push({
        id: stream.id || `unknown-${Date.now()}-${Math.random()}`,
        user_id: stream.user_id || 'unknown',
        user_name: stream.user_name || 'Unknown User',
        user_login: stream.user_login || 'unknown_user',
        game_id: stream.game_id || 'unknown',
        game_name: (game && game.name) || (stream && stream.game_name) || 'Unknown Game',
        title: stream.title || 'No Title',
        viewer_count: stream.viewer_count || 0,
        language: stream.language || 'unknown',
        profile_image_url: profileImageUrl,
        tags: (Array.isArray(stream.tags) ? stream.tags : [])
      });
    }
  }
  
  console.log(`Created ${formattedStreams.length} formatted stream objects`);
  
  // 視聴者数でソート
  formattedStreams.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
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
    if (error.message && error.message.includes('Missing required environment variables')) {
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
        message: error.response.data && error.response.data.message ? error.response.data.message : error.message,
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
