const axios = require('axios');

// 定数
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5分
const BATCH_SIZE = 300;
const TOKEN_EXPIRY_MARGIN_MS = 60 * 1000; // 1分のマージン（より安全）
const PLACEHOLDER_IMAGE_URL = (name) => `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${name.charAt(0).toUpperCase()}`;

// レートリミット関連の定数
const RATE_LIMIT_THRESHOLD = 10; // 残りリクエスト数がこの数値を下回ったら待機
const RATE_LIMIT_SAFE_MARGIN_MS = 1000; // リセット時間への安全マージン (1秒)
const MAX_RETRIES = 3; // API呼び出しの最大リトライ回数

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;

// エラーハンドリング用のカスタムエラークラス
class TwitchAPIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "TwitchAPIError";
    this.statusCode = statusCode || 500; // デフォルトは500
  }
}

// 環境変数のバリデーション
function validateEnvironment() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new TwitchAPIError("Twitch Client ID and Secret must be set in environment variables.", 500);
  }
}

// Twitchの認証トークンを取得する関数
async function getTwitchToken() {
  // 現在のトークンが有効かチェック
  if (twitchToken && tokenExpiry && Date.now() < tokenExpiry - TOKEN_EXPIRY_MARGIN_MS) {
    console.log('Reusing existing token');
    return twitchToken;
  }

  console.log('Requesting new Twitch token');
  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });

    if (!response.data?.access_token) {
      throw new TwitchAPIError('Invalid token response', 500);
    }

    console.log('Successfully obtained new token');
    twitchToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - TOKEN_EXPIRY_MARGIN_MS;
    return twitchToken;

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const statusCode = error.response?.status || 500;
    console.error('Token acquisition failed:', errorMessage, statusCode);
    throw new TwitchAPIError(`Failed to get Twitch token: ${errorMessage}`, statusCode);
  }
}

// レートリミット超過時に待機する関数
async function waitRateLimitReset(headers) {
  if (!headers) return;
  
  const remaining = parseInt(headers['ratelimit-remaining'], 10);
  const resetTime = parseInt(headers['ratelimit-reset'], 10);

  if (isNaN(remaining) || isNaN(resetTime)) {
    console.warn('Rate limit headers are missing or invalid. Skipping rate limit wait.');
    return;
  }

  if (remaining < RATE_LIMIT_THRESHOLD) {
    const waitTime = Math.max(0, (resetTime * 1000) - Date.now() + RATE_LIMIT_SAFE_MARGIN_MS);
    console.warn(`Approaching rate limit. Waiting for ${waitTime}ms (until ${new Date(resetTime * 1000)})`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    console.log('Rate limit wait finished. Resuming requests.');
  }
}

// API呼び出し用のラッパー関数（リトライロジック付き）
async function callTwitchAPI(url, params, token, method = 'get') {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const config = {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params
      };
      
      const response = method === 'get' 
        ? await axios.get(url, config)
        : await axios.post(url, null, config);
      
      // レートリミット処理
      await waitRateLimitReset(response.headers);
      
      return response.data;
    } catch (error) {
      retries++;
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      // 401エラーの場合、トークンを無効化して再試行
      if (statusCode === 401) {
        console.log('Token expired or invalid. Invalidating token.');
        twitchToken = null;
        tokenExpiry = null;
        // トークンの再取得は呼び出し元で行う
        throw new TwitchAPIError('Authentication failed. Token invalid.', 401);
      }
      
      // 400エラーの場合（無効なカーソルなど）は処理を停止せず結果を返す
      if (statusCode === 400) {
        console.warn('Bad request (400 error): Probably reached the end of available data');
        return { data: [], pagination: {} }; // 空のデータを返して処理を続行
      }
      
      // レート制限エラーの場合は待機して再試行
      if (statusCode === 429) {
        const resetHeader = error.response?.headers['ratelimit-reset'];
        const resetTime = resetHeader ? parseInt(resetHeader, 10) * 1000 : Date.now() + 5000;
        const waitTime = Math.max(0, resetTime - Date.now() + RATE_LIMIT_SAFE_MARGIN_MS);
        
        console.warn(`Rate limit exceeded. Waiting for ${waitTime}ms before retry.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 最後のリトライの場合はエラーをスロー
      if (retries >= MAX_RETRIES) {
        console.error(`Failed after ${MAX_RETRIES} retries:`, errorMessage);
        throw new TwitchAPIError(`API call failed: ${errorMessage}`, statusCode || 500);
      }
      
      // エクスポネンシャルバックオフ
      const waitTime = Math.pow(2, retries) * 1000;
      console.warn(`Attempt ${retries} failed: ${errorMessage}. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// 配信時間を計算する関数
function calculateDuration(startedAt) {
  try {
    if (!startedAt) {
      return '配信時間不明';
    }
    
    const startTime = new Date(startedAt);
    if (isNaN(startTime.getTime())) {
      console.warn(`Invalid date format: ${startedAt}`);
      return '配信時間不明';
    }
    
    const now = new Date();
    const durationMs = now - startTime;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  } catch (error) {
    console.error('Error calculating duration:', error);
    return '配信時間不明';
  }
}

// バルクでバッチ処理を行う汎用関数
async function processBatch(items, batchSize, processFn) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processFn(batch);
    results.push(...batchResults);
  }
  
  return results;
}

// ユーザー情報を取得する関数
async function fetchUsers(userIds, token) {
  // 元の実装のままで、フィルタリングなし
  const fetchBatch = async (batch) => {
    const params = new URLSearchParams();
    batch.forEach(id => params.append('id', id));
    
    const data = await callTwitchAPI('https://api.twitch.tv/helix/users', params, token);
    return data?.data || [];
  };
  
  const users = await processBatch(userIds, BATCH_SIZE, fetchBatch);
  
  // サンプルのユーザー情報をログ出力 (デバッグ用)
  if (users.length > 0) {
    console.log("Sample user data:", {
      id: users[0].id,
      login: users[0].login,
      display_name: users[0].display_name,
      has_profile_image: !!users[0].profile_image_url
    });
  } else {
    console.warn("No user data returned from Twitch API");
  }
  
  // ユーザー情報をIDでマップ化
  const usersMap = {};
  users.forEach(user => {
    if (user && user.id) {
      usersMap[user.id] = user;
    }
  });
  
  return usersMap;
}

// ストリームデータを取得して整形する関数
async function fetchAndFormatStreams(token) {
  console.log('Fetching streams from Twitch API');
  
  try {
    // 複数ページのストリームデータを取得
    let allStreams = [];
    let cursor = null;
    let pageCount = 0;
    const maxPages = 4; // より多くのデータを取得するために増やす
    let hasMorePages = true; // ページングの継続フラグ
    
    do {
      try {
        const params = {
          language: 'ja', // 日本語配信のみを取得
          first: 50 // 1ページあたり50件
        };
        
        // ページネーションのカーソルがある場合は追加
        if (cursor) {
          params.after = cursor;
        }
        
        console.log(`Fetching page ${pageCount + 1} with cursor: ${cursor || 'initial'}`);
        
        const data = await callTwitchAPI(
          'https://api.twitch.tv/helix/streams',
          params,
          token
        );

        if (!data || !data.data) {
          console.warn('Invalid or empty response from Twitch API');
          break; // 無効なレスポンスならループを抜ける
        }

        const streams = data.data;
        
        // 取得したデータが0件ならループを抜ける
        if (streams.length === 0) {
          console.log('Received 0 streams, no more data available');
          hasMorePages = false;
          break;
        }
        
        allStreams = [...allStreams, ...streams];
        
        // 次のページのカーソルを保存
        cursor = data.pagination?.cursor;
        pageCount++;
        
        console.log(`Fetched page ${pageCount} with ${streams.length} streams. Total: ${allStreams.length}`);
        
        // カーソルがない場合はこれ以上のページがないためループを抜ける
        if (!cursor) {
          console.log('No pagination cursor returned, reached end of data');
          hasMorePages = false;
          break;
        }
        
        // ページ数に達した場合もループを抜ける
        if (pageCount >= maxPages) {
          console.log(`Reached maximum page count (${maxPages})`);
          break;
        }
        
        // 短い間隔でのリクエストを避けるために少し待機
        if (hasMorePages && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms待機
        }
      } catch (error) {
        if (error.statusCode === 400) {
          console.warn('Received 400 error, probably reached end of available data');
          hasMorePages = false;
          break;
        } else {
          console.error(`Error fetching page ${pageCount + 1}:`, error);
          // 1ページ取得に失敗しても続行する
          if (allStreams.length > 0) {
            console.log(`Continuing with ${allStreams.length} streams already fetched`);
            break;
          } else {
            throw error; // データがまだ何も取れていない場合は例外をスロー
          }
        }
      }
    } while (hasMorePages && pageCount < maxPages);

    // ログ出力（デバッグ用）
    console.log(`Total streams fetched: ${allStreams.length}`);
    
    // 十分なデータが取得できない場合の警告
    if (allStreams.length < 90) {
      console.warn(`Warning: Only fetched ${allStreams.length} streams, which is less than the target of 100`);
    }

    // ユーザー情報を取得するためのユーザーIDを収集
    const userIds = allStreams.map(stream => stream.user_id);
    
    // ユーザー情報を取得
    const usersMap = await fetchUsers(userIds, token);
    
    // ストリーム情報とユーザー情報を結合して整形
    const formattedStreams = allStreams.map(stream => {
      const user = usersMap[stream.user_id] || {};
      
      // プロフィール画像が取得できない場合はプレースホルダーを使用
      const profileImageUrl = user.profile_image_url || PLACEHOLDER_IMAGE_URL(stream.user_name);
      
      // デバッグ用ログ (最初の数件のみ)
      if (allStreams.indexOf(stream) < 5) {
        console.log(`Stream ${stream.user_name} (ID: ${stream.user_id}): profile_image_url = ${profileImageUrl}`);
      }
      
      return {
        id: stream.id,
        user_id: stream.user_id,
        user_name: stream.user_name,
        user_login: stream.user_login,
        title: stream.title,
        viewer_count: stream.viewer_count,
        started_at: stream.started_at,
        profile_image_url: profileImageUrl,
        thumbnail_url: stream.thumbnail_url
          ? stream.thumbnail_url.replace('{width}', '40').replace('{height}', '40')
          : PLACEHOLDER_IMAGE_URL(stream.user_name),
        language: stream.language,
        game_name: stream.game_name || 'その他',
        stream_duration: calculateDuration(stream.started_at),
        tags: stream.tags || []
      };
    });

    // 重複を除去（streamのIDをキーにして）
    const uniqueStreamIds = new Set();
    const filteredStreams = formattedStreams.filter(stream => {
      if (uniqueStreamIds.has(stream.id)) {
        console.log(`重複を検出: ${stream.user_name} (ID: ${stream.id})`);
        return false;
      }
      uniqueStreamIds.add(stream.id);
      return true;
    });

    // 視聴者数でソート
    filteredStreams.sort((a, b) => b.viewer_count - a.viewer_count);
    
    // ログ出力（デバッグ用）
    console.log(`Filtered unique streams: ${filteredStreams.length}`);

    return filteredStreams;
    
  } catch (error) {
    console.error('Error fetching and formatting streams:', error);
    if (error instanceof TwitchAPIError) {
      throw error;
    }
    throw new TwitchAPIError(`Failed to fetch streams: ${error.message}`, 500);
  }
}

// APIハンドラー
module.exports = async (req, res) => {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('API request received');
  
  try {
    // 環境変数をチェック
    validateEnvironment();
    
    // キャッシュをチェック
    if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_EXPIRATION_MS) {
      console.log('Using cached data');
      // キャッシュデータの長さが少なすぎる場合はキャッシュを無視
      if (cachedData.length < 90) {
        console.log(`Cached data has only ${cachedData.length} items, fetching fresh data`);
      } else {
        return res.status(200).json(cachedData);
      }
    }
    
    // 新しいデータを取得
    console.log('Getting fresh data from Twitch API');
    let token;
    
    try {
      token = await getTwitchToken();
    } catch (error) {
      console.error('Failed to get token:', error.message);
      
      // キャッシュがあれば古いデータでも返す
      if (cachedData && cachedData.length > 0) {
        console.log('Returning cached data due to token error');
        return res.status(200).json(cachedData);
      }
      
      return res.status(error.statusCode || 500).json({ error: 'Authentication failed' });
    }
    
    const streams = await fetchAndFormatStreams(token);
    
    // キャッシュを更新 (データが十分にある場合のみ)
    if (streams.length >= 90) {
      cachedData = streams;
      cacheTime = Date.now();
      console.log(`Updated cache with ${streams.length} streams`);
    } else if (!cachedData || cachedData.length < streams.length) {
      // 既存のキャッシュがない、または現在のデータの方が多い場合はキャッシュ更新
      cachedData = streams;
      cacheTime = Date.now();
      console.log(`Updated cache with limited data (${streams.length} streams)`);
    } else {
      console.log(`New data has only ${streams.length} streams, keeping existing cache with ${cachedData.length} streams`);
    }
    
    return res.status(200).json(streams.length >= 90 ? streams : (cachedData || streams));
  } catch (error) {
    console.error('Error:', error.message, error.statusCode);
    
    // エラー時も既存のキャッシュがあれば返す
    if (cachedData && cachedData.length > 0) {
      console.log('Returning cached data due to API error');
      return res.status(200).json(cachedData);
    }
    
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
