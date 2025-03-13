const axios = require('axios');

// 定数
const TOKEN_EXPIRY_MARGIN_MS = 60 * 1000; // 1分のマージン
const PLACEHOLDER_IMAGE_URL = (name) => `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${name.charAt(0).toUpperCase()}`;
const CACHE_DURATION_MS = 60 * 1000; // 1分間のキャッシュ

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedStreamersData = null;
let cacheTime = null;

// エラーハンドリング用のカスタムエラークラス
class TwitchAPIError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'TwitchAPIError';
    this.statusCode = statusCode;
  }
}

// 期待の新人配信者リスト
const NEWCOMER_STREAMERS = [
  'hinanotachiba7',
  'akarindao',
  'met_komori',
  'ramuneshiranami',
  'kagasumire',
  'uruhaichinose',
  'ren_kisaragi__',
  '963noah',
  'shinomiya_runa',
  'lisahanabusa',
];

// APIハンドラー
module.exports = async (req, res) => {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Newcomers API request received');
  
  try {
    // キャッシュが有効な場合はキャッシュからデータを返す
    if (cachedStreamersData && cacheTime && (Date.now() - cacheTime < CACHE_DURATION_MS)) {
      console.log('Returning cached newcomer streamers data');
      return res.status(200).json(cachedStreamersData);
    }

    // 環境変数をチェック
    validateEnvironment();
    
    // 認証トークンを取得
    let token;
    try {
      token = await getTwitchToken();
    } catch (error) {
      console.error('Failed to get token:', error.message);
      return res.status(error.statusCode || 500).json({ error: 'Authentication failed' });
    }
    
    try {
      console.log('Fetching newcomer streamers data...');
      
      // 新人配信者の情報を取得（バッチ処理による最適化）
      const streamersData = await fetchNewcomerStreamersOptimized(token);
      
      // 結果をキャッシュに保存
      cachedStreamersData = streamersData;
      cacheTime = Date.now();
      
      return res.status(200).json(streamersData);
    } catch (error) {
      console.error('Error fetching newcomer streamers:', error);
      return res.status(error.statusCode || 500).json({ 
        error: 'Failed to fetch newcomer streamers', 
        message: error.message 
      });
    }
  } catch (error) {
    console.error('Error:', error.message, error.statusCode);
    
    if (error instanceof TwitchAPIError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// 環境変数をチェックする関数
function validateEnvironment() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new TwitchAPIError('Twitch API credentials are missing', 500);
  }
}

// Twitch APIトークンを取得する関数
async function getTwitchToken() {
  // 既存のトークンがまだ有効な場合はそれを使用
  if (twitchToken && tokenExpiry && Date.now() < tokenExpiry - TOKEN_EXPIRY_MARGIN_MS) {
    return twitchToken;
  }
  
  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );
    
    if (response.data && response.data.access_token) {
      twitchToken = response.data.access_token;
      // トークンの有効期限を設定（通常は2時間）
      tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return twitchToken;
    } else {
      throw new TwitchAPIError('Invalid token response from Twitch', 500);
    }
  } catch (error) {
    console.error('Error getting Twitch token:', error.message);
    throw new TwitchAPIError(`Failed to get Twitch token: ${error.message}`, 500);
  }
}

// Twitch APIを呼び出す関数（リトライロジック付き）
async function callTwitchAPI(url, params, token, retryCount = 0) {
  const MAX_RETRIES = 2;
  
  try {
    const response = await axios.get(url, {
      params: params,
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Twitch API call failed (attempt ${retryCount + 1}):`, error.message);
    
    // エラーレスポンスの詳細情報を取得
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = `Twitch API returned ${statusCode}: ${JSON.stringify(error.response.data)}`;
      
      // 認証エラーの場合はトークンをリセットして再取得
      if (statusCode === 401 && retryCount < MAX_RETRIES) {
        console.log('Auth token expired, refreshing token and retrying...');
        twitchToken = null;
        tokenExpiry = null;
        const newToken = await getTwitchToken();
        return callTwitchAPI(url, params, newToken, retryCount + 1);
      }
    }
    
    // リトライが可能な場合
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // エクスポネンシャルバックオフ
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callTwitchAPI(url, params, token, retryCount + 1);
    }
    
    throw new TwitchAPIError(errorMessage, statusCode);
  }
}

// 並列リクエストを使って新人配信者の情報を効率的に取得する関数
async function fetchNewcomerStreamersOptimized(token) {
  try {
    // 1. 並列で必要なデータを取得
    console.log('Fetching streams and users data in parallel...');
    
    const [streamsResponse, usersResponse] = await Promise.all([
      // 配信中の新人配信者を取得
      callTwitchAPI(
        'https://api.twitch.tv/helix/streams',
        { 
          user_login: NEWCOMER_STREAMERS,
          first: 100
        },
        token
      ),
      
      // 配信者のユーザー情報を取得
      callTwitchAPI(
        'https://api.twitch.tv/helix/users',
        { login: NEWCOMER_STREAMERS },
        token
      )
    ]);
    
    const liveStreams = streamsResponse.data || [];
    const users = usersResponse.data || [];
    
    console.log(`Found ${liveStreams.length} live newcomer streamers`);
    console.log(`Found ${users.length} newcomer user profiles`);
    
    // ユーザー情報をマップ形式で整理
    const usersMap = {};
    users.forEach(user => {
      usersMap[user.login.toLowerCase()] = user;
    });
    
    // 配信中の情報をマップ形式で整理
    const streamsMap = {};
    liveStreams.forEach(stream => {
      streamsMap[stream.user_login.toLowerCase()] = stream;
    });
    
    // 全ての新人配信者の情報を作成（配信中でなくても表示）
    const allStreamersData = NEWCOMER_STREAMERS.map(streamerLogin => {
      const lowerLogin = streamerLogin.toLowerCase();
      const stream = streamsMap[lowerLogin];
      const user = usersMap[lowerLogin];
      
      // 配信中の場合
      if (stream) {
        return {
          id: stream.id,
          user_id: stream.user_id,
          user_name: stream.user_name,
          user_login: stream.user_login,
          title: stream.title,
          viewer_count: stream.viewer_count,
          started_at: stream.started_at,
          profile_image_url: user ? user.profile_image_url : PLACEHOLDER_IMAGE_URL(stream.user_name),
          thumbnail_url: stream.thumbnail_url
            ? stream.thumbnail_url.replace('{width}', '40').replace('{height}', '40')
            : PLACEHOLDER_IMAGE_URL(stream.user_name),
          language: stream.language,
          game_name: stream.game_name || 'その他',
          stream_duration: calculateDuration(stream.started_at),
          tags: stream.tags || [],
          is_live: true
        };
      } 
      // 配信中でない場合
      else if (user) {
        return {
          user_id: user.id,
          user_name: user.display_name,
          user_login: user.login,
          title: "配信していません",
          viewer_count: 0,
          profile_image_url: user.profile_image_url || PLACEHOLDER_IMAGE_URL(user.display_name),
          thumbnail_url: PLACEHOLDER_IMAGE_URL(user.display_name),
          game_name: "オフライン",
          is_live: false
        };
      }
      // ユーザー情報も取得できなかった場合
      else {
        return {
          user_login: streamerLogin,
          user_name: streamerLogin,
          title: "配信していません",
          viewer_count: 0,
          profile_image_url: PLACEHOLDER_IMAGE_URL(streamerLogin),
          thumbnail_url: PLACEHOLDER_IMAGE_URL(streamerLogin),
          game_name: "オフライン",
          is_live: false
        };
      }
    });
    
    // 視聴者数でソート（配信中の人が上位に来るように）
    allStreamersData.sort((a, b) => {
      // まず配信状態でソート（配信中が上）
      if (a.is_live !== b.is_live) {
        return a.is_live ? -1 : 1;
      }
      // 次に視聴者数でソート
      return b.viewer_count - a.viewer_count;
    });
    
    return allStreamersData;
  } catch (error) {
    console.error('Error fetching newcomer streamers:', error);
    throw error;
  }
}

// 配信時間を計算する関数
function calculateDuration(startTimeStr) {
  if (!startTimeStr) return '配信時間不明';
  
  const startTime = new Date(startTimeStr);
  const now = new Date();
  const durationMs = now - startTime;
  
  // ミリ秒を時間と分に変換
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  let durationText = '';
  if (hours > 0) {
    durationText += `${hours}時間`;
  }
  if (minutes > 0 || hours === 0) {
    durationText += `${minutes}分`;
  }
  
  return durationText;
}
