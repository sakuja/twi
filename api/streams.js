const axios = require('axios');

// 定数
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5分
const BATCH_SIZE = 100;
const MAX_PAGES = 3;
const TOKEN_EXPIRY_MARGIN_MS = 5 * 1000; // 5秒のマージン
const PLACEHOLDER_IMAGE_URL = (name) => `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${name.charAt(0).toUpperCase()}`;

// レートリミット関連の定数
const RATE_LIMIT_THRESHOLD = 10; // 残りリクエスト数がこの数値を下回ったら待機
const RATE_LIMIT_SAFE_MARGIN_MS = 1000; // リセット時間への安全マージン (1秒)

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;

// 環境変数チェック
if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
  console.error("ERROR: Twitch Client ID and Secret must be set in environment variables.");
  // process.exit(1); // エラーをthrowするように変更することを検討
}

// エラーハンドリング用のカスタムエラークラス
class TwitchAPIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "TwitchAPIError";
    this.statusCode = statusCode || 500; // デフォルトは500
  }
}

// デモデータを返す関数（開発/テスト用）
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
    if (twitchToken && tokenExpiry && Date.now() < tokenExpiry) {
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


// Twitchストリームを取得する関数
async function fetchTwitchStreams(token) {
    console.log('Fetching streams from Twitch API');
    let allStreams = [];
    let cursor = null;

    try {
        for (let pageCount = 0; pageCount < MAX_PAGES; pageCount++) {
            const params = {
                first: BATCH_SIZE,
                ...(cursor && { after: cursor }) // カーソルがあれば追加
            };

            const streamsResponse = await axios.get('https://api.twitch.tv/helix/streams', {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${token}`
                },
                params
            });

            await waitRateLimitReset(streamsResponse.headers); // レートリミット処理

            if (!streamsResponse.data?.data) {
                throw new TwitchAPIError('Invalid streams response', 500);
            }

            const streams = streamsResponse.data.data;
            console.log(`Retrieved ${streams.length} streams from page ${pageCount + 1}`);
            allStreams.push(...streams);

            cursor = streamsResponse.data.pagination?.cursor;
            if (!cursor) break; // 次のページがない場合は終了

          // 簡易レートリミット処理は削除 (waitRateLimitReset に置き換え)
          // await new Promise(resolve => setTimeout(resolve, 300));
        }

        console.log(`Total streams retrieved: ${allStreams.length}`);
        const japaneseStreams = allStreams.filter(stream => stream.language === 'ja');
        console.log(`Filtered to ${japaneseStreams.length} Japanese streams`);

        return japaneseStreams.length > 0 ? japaneseStreams : allStreams;

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 500;
      console.error('Error in fetchTwitchStreams:', errorMessage);
        throw new TwitchAPIError(`Error fetching Twitch streams: ${errorMessage}`, statusCode);
    }
}


// ストリーム情報を処理する関数 (大幅に簡略化)
async function processStreams(streams, token) {
    if (!streams.length) return [];

    console.log('Fetching game and user information...');

    // 重複しないゲームIDとユーザーID/ログイン名を取得
    const gameIds = [...new Set(streams.map(s => s.game_id).filter(id => id))];
    const userIds = [...new Set(streams.map(s => s.user_id))];
    const userLogins = [...new Set(streams.map(s => s.user_login))];

    // バルクリクエストでゲーム情報を取得
    const gamesMap = await fetchGames(gameIds, token);
    // バルクリクエストでユーザー情報を取得 (loginベース)
    const usersMap = await fetchUsers(userLogins, token);
    // バルクリクエストでチャンネル情報を取得
    const channelsMap = await fetchChannels(userIds, token);


    // データを整形
    const formattedStreams = streams.map(stream => {
        const game = gamesMap[stream.game_id] || {};
        const user = usersMap[stream.user_login] || {};  // user_login で検索
        const channel = channelsMap[stream.user_id] || {};

        return {
            id: stream.id,
            user_id: stream.user_id,
            user_name: stream.user_name,
            user_login: stream.user_login,
            game_id: stream.game_id,
            game_name: game.name || channel.game_name || 'その他',
            title: stream.title,
            viewer_count: stream.viewer_count,
            language: stream.language,
            profile_image_url: user.profile_image_url || PLACEHOLDER_IMAGE_URL(stream.user_name),
            thumbnail_url: user.profile_image_url || PLACEHOLDER_IMAGE_URL(stream.user_name), // 同じ画像でOK
            tags: stream.tags || []
        };
    });



// 視聴者数でソート
formattedStreams.sort((a, b) => b.viewer_count - a.viewer_count);

// 最大50件に制限
const top50Streams = formattedStreams.slice(0, 50);
console.log(`Returning top ${top50Streams.length} streams`);

return top50Streams;


}



// バルクでゲーム情報を取得する関数
async function fetchGames(gameIds, token) {
    const allGames = [];
    for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
        const batch = gameIds.slice(i, i + BATCH_SIZE);
        const params = new URLSearchParams();
        batch.forEach(id => params.append('id', id));

        try {
            const gameResponse = await axios.get('https://api.twitch.tv/helix/games', {
                headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
                params
            });

            await waitRateLimitReset(gameResponse.headers); // レートリミット処理

          if (gameResponse.data?.data) {
              allGames.push(...gameResponse.data.data);
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message
          console.error('Error fetching game batch:',errorMessage);
          // ここではエラーを再スローしない（一部のゲーム情報が取得できなくても続行）
        }
    }
    const gamesMap = {};
    allGames.forEach(game => gamesMap[game.id] = game);
    return gamesMap;
}

// バルクでユーザー情報を取得する関数
async function fetchUsers(userLogins, token) {
  const allUsers = [];

  for (let i = 0; i < userLogins.length; i += BATCH_SIZE) {
    const batch = userLogins.slice(i, i + BATCH_SIZE);
    const params = new URLSearchParams();
    batch.forEach(login => params.append('login', login));

    try {
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
        params
      });

      await waitRateLimitReset(userResponse.headers); // レートリミット処理

      if (userResponse.data?.data) {
        allUsers.push(...userResponse.data.data);
      }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('Error fetching user batch:', errorMessage);
      // ここではエラーを再スローしない
    }
  }

  const usersMap = {};
  allUsers.forEach(user => {
    usersMap[user.login] = user; // login をキーにする
    usersMap[user.id] = user;    // id もキーにする
  });
  return usersMap;
}

// バルクでチャンネル情報を取得する関数
async function fetchChannels(userIds, token) {
    const allChannels = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);
        const params = new URLSearchParams();
        batch.forEach(id => params.append('broadcaster_id', id));

        try {
            const channelsResponse = await axios.get('https://api.twitch.tv/helix/channels', {
                headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
                params
            });

            await waitRateLimitReset(channelsResponse.headers); // レートリミット処理

          if(channelsResponse.data?.data){
            allChannels.push(...channelsResponse.data.data);
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          console.error('Error fetching channel batch:', errorMessage);
          // ここではエラーを再スローしない
        }
    }
    const channelsMap = {};
    allChannels.forEach(channel => channelsMap[channel.broadcaster_id] = channel);
    return channelsMap;
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
        // キャッシュチェック
        if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_EXPIRATION_MS) {
            console.log('Using cached data');
            return res.status(200).json(cachedData);
        }

        // 新しいデータを取得
        console.log('Getting fresh data from Twitch API');
        const token = await getTwitchToken();
        const streams = await fetchTwitchStreams(token);
        const processedStreams = await processStreams(streams, token);

        // キャッシュを更新
        cachedData = processedStreams;
        cacheTime = Date.now();

        return res.status(200).json(processedStreams);

    } catch (error) {
        console.error('Error:', error.message, error.statusCode);
        if (error instanceof TwitchAPIError) {
            return res.status(error.statusCode).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
