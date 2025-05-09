// 必要なモジュールをインポート
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// 環境変数を読み込む
require('dotenv').config();

// 環境変数から設定を取得
const PORT = process.env.PORT || 3000;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

// 環境変数の確認
console.log('環境変数のステータス:');
console.log('- PORT:', PORT);
console.log('- TWITCH_CLIENT_ID設定済み:', !!TWITCH_CLIENT_ID);
console.log('- TWITCH_CLIENT_SECRET設定済み:', !!TWITCH_CLIENT_SECRET);

// Twitchの認証情報が設定されているか確認
if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.warn('警告: Twitch API認証情報が設定されていません。.envファイルを確認してください。');
}

// Expressアプリケーションを作成
const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Twitchのカテゴリ別ストリーミングデータを取得するAPI
app.get('/api/streams/category', async (req, res) => {
    try {
        // カテゴリIDをクエリパラメータから取得
        const categoryId = req.query.category_id;
        
        // 認証トークンを取得
        const token = await getTwitchToken();
        
        // リクエストパラメータを設定
        const params = {
            first: 100 // 最大100件のストリームを取得
        };
        
        // カテゴリIDが指定されている場合は追加
        if (categoryId) {
            params.game_id = categoryId;
        }
        
        // Twitch APIにリクエスト（指定されたカテゴリのストリームを取得）
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: params
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
        console.error('Error fetching category streams:', error);
        res.status(500).json({ error: 'Failed to fetch category stream data' });
    }
});

// カテゴリ（ゲーム）一覧を取得するAPI
app.get('/api/categories', async (req, res) => {
    try {
        console.log('カテゴリ一覧の取得を開始します');
        
        // 認証トークンを取得
        const token = await getTwitchToken();
        console.log('認証トークンを取得しました');
        
        // 人気のゲームを取得
        console.log('Twitch APIにリクエストを送信します');
        const response = await axios.get('https://api.twitch.tv/helix/games/top', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                first: 100 // 最大100件のゲームを取得
            }
        });
        
        console.log(`${response.data.data.length}件のカテゴリを取得しました`);
        
        // ゲームデータを整形
        const categories = response.data.data.map(game => {
            return {
                id: game.id,
                name: game.name,
                box_art_url: game.box_art_url.replace('{width}', '138').replace('{height}', '190')
            };
        });
        
        // クライアントに結果を返す
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        // エラーの詳細をログに出力
        if (error.response) {
            // サーバーからのレスポンスがある場合
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            // リクエストは送信されたがレスポンスがない場合
            console.error('No response received');
        } else {
            // リクエスト設定時にエラーが発生した場合
            console.error('Error message:', error.message);
        }
        
        // クライアントにエラー情報を返す
        res.status(500).json({ 
            error: 'Failed to fetch category data', 
            message: error.message,
            details: error.response ? error.response.data : null
        });
    }
});

// サーバーを起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
