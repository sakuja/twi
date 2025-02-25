// 必要なモジュールをインポート
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Expressアプリケーションを作成
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Twitch APIの認証情報
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

// TwitchのOAuthトークンを保存する変数
let twitchToken = null;
let tokenExpiry = null;

// Twitchの認証トークンを取得する関数
async function getTwitchToken() {
    // トークンが有効なら再利用
    if (twitchToken && tokenExpiry && Date.now() < tokenExpiry) {
        return twitchToken;
    }
    
    try {
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
        // 有効期限を設定（通常は約60日だが、念のため少し短めに設定）
        tokenExpiry = Date.now() + (response.data.expires_in * 900); // 90%の時間を使用
        
        return twitchToken;
    } catch (error) {
        console.error('Failed to get Twitch token:', error);
        throw new Error('Twitch authentication failed');
    }
}

// Twitchのストリーミングデータを取得するAPI
app.get('/api/streams', async (req, res) => {
    try {
        // 認証トークンを取得
        const token = await getTwitchToken();
        
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
        
        // ユーザー情報とゲーム情報を取得するためのIDを集める
        const userIds = response.data.data.map(stream => stream.user_id);
        const gameIds = [...new Set(response.data.data.map(stream => stream.game_id).filter(id => id))];
        
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
        
        // ゲーム情報を取得
        const gamesResponse = await axios.get('https://api.twitch.tv/helix/games', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                id: gameIds.join(',')
            }
        });
        
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
        
        // クライアントに結果を返す
        res.json(streams);
    } catch (error) {
        console.error('Error fetching streams:', error);
        res.status(500).json({ error: 'Failed to fetch stream data' });
    }
});

// サーバーを起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});