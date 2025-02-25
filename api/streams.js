const axios = require('axios');

// Twitch APIの認証情報
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

// キャッシュ変数
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;

// Twitchの認証トークンを取得する関数
async function getTwitchToken() {
    // トークンが有効なら再利用
    if (twitchToken && tokenExpiry && Date.now() < tokenExpiry) {
        return twitchToken;
    }
    
    try {
        console.log('Getting new Twitch token...');
        // Twitchの認証APIにリクエスト
        const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
            params: {
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });
        
        // トークンを保存
        twitchToken = response.data.access_token;
        // 有効期限を設定
        tokenExpiry = Date.now() + (response.data.expires_in * 900); // 90%の時間を使用
        console.log('Token acquired successfully');
        
        return twitchToken;
    } catch (error) {
        console.error('Failed to get Twitch token:', error.message);
        throw new Error('Twitch authentication failed');
    }
}

// キャッシュされたデータを確認し、必要に応じて更新する関数
async function getCachedData() {
    // キャッシュが5分以内なら再利用（Twitchのレート制限を避けるため）
    if (cachedData && cacheTime && (Date.now() - cacheTime) < 300000) {
        console.log('Using cached data');
        return cachedData;
    }
    
    // 新しいデータを取得
    console.log('Cache expired, fetching new data');
    const data = await fetchTwitchData();
    cachedData = data;
    cacheTime = Date.now();
    
    return data;
}

// Twitchデータを取得する関数
async function fetchTwitchData() {
    try {
        // 認証トークンを取得
        const token = await getTwitchToken();
        
        console.log('Fetching top streams from Twitch API...');
        // Twitch APIにリクエスト（トップストリームを取得）
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                first: 100 // 最大100件のストリームを取得
            }
        });
        
        console.log('Got streams data. Total streams:', response.data.data.length);
        
        // ユーザー情報とゲーム情報を取得するためのIDを集める
        const userIds = response.data.data.map(stream => stream.user_id);
        const gameIds = [...new Set(response.data.data.map(stream => stream.game_id).filter(id => id))];
        
        console.log('Fetching user data for', userIds.length, 'users');
        // ユーザー情報を取得
        const usersResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                id: userIds.join(',')
            }
        });
        
        console.log('Fetching game data for', gameIds.length, 'games');
        // ゲーム情報を取得
        const gamesResponse = gameIds.length > 0 ? await axios.get('https://api.twitch.tv/helix/games', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                id: gameIds.join(',')
            }
        }) : { data: { data: [] } };
        
        // ユーザーデータをマップ
        const usersMap = {};
        usersResponse.data.data.forEach(user => {
            usersMap[user.id] = user;
        });
        
        // ゲームデータをマップ
        const gamesMap = {};
        gamesResponse.data.data.forEach(game => {
            gamesMap[game.id] = game;
        });
        
        // ストリームデータを整形
        const streams = response.data.data.map(stream => {
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
        streams.sort((a, b) => b.viewer_count - a.viewer_count);
        console.log('Processed stream data successfully, returning', streams.length, 'streams');
        
        return streams;
    } catch (error) {
        console.error('Error in fetchTwitchData:', error.message);
        throw error;
    }
}

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
        // データ取得
        const data = await getCachedData();
        console.log('Returning data to client');
        return res.status(200).json(data);
    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
