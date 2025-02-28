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
    
    let allStreams = [];
    let cursor = null;
    const MAX_PAGES = 3; // 最大3ページ分取得（1ページ100件なので最大300件）
    let pageCount = 0;
    
    // ページネーションを使って複数ページのデータを取得
    do {
      const params = {
        first: 100 // 1ページあたり最大100件
      };
      
      // 2ページ目以降の取得にはカーソルを使用
      if (cursor) {
        params.after = cursor;
      }
      
      const streamsResponse = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params: params
      });
      
      if (!streamsResponse.data || !streamsResponse.data.data) {
        throw new Error('Invalid streams response');
      }
      
      const streams = streamsResponse.data.data;
      console.log(`Retrieved ${streams.length} streams from page ${pageCount + 1}`);
      
      allStreams = [...allStreams, ...streams];
      
      // ページネーション用の次ページカーソルを取得
      cursor = streamsResponse.data.pagination?.cursor;
      pageCount++;
      
      // 最大ページ数に達したらループを終了
      if (pageCount >= MAX_PAGES) {
        break;
      }
      
      // APIレート制限を避けるために少し待機
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
    } while (cursor);
    
    console.log(`Total streams retrieved: ${allStreams.length}`);
    
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



// ストリーム情報を処理する関数
async function processStreams(streams, token) {
  if (streams.length === 0) {
    return [];
  }
  




// ゲーム情報を取得
console.log('Fetching game information');
const gameIds = [...new Set(streams.map(stream => stream.game_id).filter(id => id))];

let allGames = [];
const gameBatches = [];
for (let i = 0; i < gameIds.length; i += 100) {
  gameBatches.push(gameIds.slice(i, i + 100));
}

for (const batch of gameBatches) {
  try {
    console.log(`Fetching batch of ${batch.length} games`);
    
    // Twitch API用にクエリパラメータを構築
    const params = new URLSearchParams();
    batch.forEach(id => {
      params.append('id', id);
    });
    
    const gameResponse = await axios.get('https://api.twitch.tv/helix/games', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      params: params
    });
    
    if (gameResponse.data && gameResponse.data.data) {
      allGames = [...allGames, ...gameResponse.data.data];
      console.log(`Retrieved ${gameResponse.data.data.length} games in this batch`);
    }
  } catch (error) {
    console.error(`Error fetching game batch:`, error.message);
  }
}

// ゲームIDをマッピング
const gamesMap = {};
allGames.forEach(game => {
  gamesMap[game.id] = game;
});


  // ユーザー情報を取得（ログイン名ベース）
  console.log('Fetching user information by login');
  const userLogins = streams.map(stream => stream.user_login);

  // ログイン名とユーザーIDのマッピングをログ出力
  console.log('Mapping logins to user IDs:');
  streams.forEach(stream => {
    console.log(`Login: ${stream.user_login}, ID: ${stream.user_id}, Name: ${stream.user_name}`);
  });
  
  // 改善: 配信者のログイン名を一括で取得するよう最適化
  let allUsers = [];
  // userLoginsを100件ずつのバッチに分割
  const loginBatches = [];
  for (let i = 0; i < userLogins.length; i += 100) {
    loginBatches.push(userLogins.slice(i, i + 100));
  }
  
  // バッチごとに一括リクエスト
  for (const batch of loginBatches) {
    try {
      console.log(`Fetching batch of ${batch.length} users`);
      
      // Twitch API用にクエリパラメータを適切に構築
      const params = new URLSearchParams();
      batch.forEach(login => {
        params.append('login', login);
      });
      
      console.log(`Request params: ${params.toString().substring(0, 100)}...`);
      
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params: params
      });

      if (userResponse.data && userResponse.data.data) {
        allUsers = [...allUsers, ...userResponse.data.data];
        console.log(`Retrieved ${userResponse.data.data.length} users in this batch`);
      }
    } catch (error) {
      console.error(`Error fetching user batch:`, error.message);
    }
  }
  
  // ユーザーIDからのチャンネル情報取得
  console.log('Fetching channel information');
  const userIds = streams.map(stream => stream.user_id);
  
  const channelBatches = [];
  for (let i = 0; i < userIds.length; i += 100) {
    channelBatches.push(userIds.slice(i, i + 100));
  }
  
  let allChannels = [];
  for (const batch of channelBatches) {
    try {
      console.log(`Fetching channel info for batch of ${batch.length} broadcasters`);
      
      // Twitch API v5のチャンネル情報取得APIは複数のIDをクエリパラメータとして受け取るには、
      // "broadcaster_id=123&broadcaster_id=456"のようにする必要がある
      // つまり batch.join(',') ではなく、個別のパラメータとして送る必要がある
      
      // URLにクエリパラメータを構築
      const params = new URLSearchParams();
      batch.forEach(id => {
        params.append('broadcaster_id', id);
      });
      
      console.log(`Request params: ${params.toString().substring(0, 100)}...`);
      
      const channelsResponse = await axios.get('https://api.twitch.tv/helix/channels', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params: params
      });
      
      if (channelsResponse.data && channelsResponse.data.data) {
        allChannels = [...allChannels, ...channelsResponse.data.data];
        console.log(`Retrieved ${channelsResponse.data.data.length} channels in this batch`);
      }
    } catch (error) {
      console.error('Error fetching channel batch:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
    }
  }
  
  // マッピング用のオブジェクトを作成
  const usersMap = {};
  allUsers.forEach(user => {
    usersMap[user.id] = user;
    // ログイン名でもマッピング
    if (user.login) {
      usersMap[user.login] = user;
    }
  });
  
  // ユーザーデータマッピングのデバッグ
  console.log(`Created user map with ${Object.keys(usersMap).length} entries`);
  
  const channelsMap = {};
  allChannels.forEach(channel => {
    channelsMap[channel.broadcaster_id] = channel;
  });
  
  // データを整形
  const formattedStreams = streams.map(stream => {
    const game = gamesMap[stream.game_id] || {};

    // ユーザー情報を検索 - まずloginで検索して、次にIDで検索
    const user = allUsers.find(u => u.login === stream.user_login) || 
                 allUsers.find(u => u.id === stream.user_id) || {};
    const channel = channelsMap[stream.user_id] || {};
    
    // デバッグ情報
    console.log(`Stream: ${stream.user_name}, User data:`, user);
    
    // プロフィール画像URLの設定 - 複数の取得方法を試す
    let profileImageUrl = null;
    
    // 方法1: userオブジェクトから直接取得
    if (user && user.profile_image_url) {
      profileImageUrl = user.profile_image_url;
      console.log(`Using profile image from user object: ${profileImageUrl}`);
    } 
    // 方法2: プレースホルダー画像を使用
    else {
      profileImageUrl = `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${stream.user_name.charAt(0).toUpperCase()}`;
      console.log(`Using placeholder image: ${profileImageUrl}`);
    }
    
  return {
    id: stream.id,
    user_id: stream.user_id,
    user_name: stream.user_name,
    user_login: stream.user_login,
    game_id: stream.game_id,
    // ゲーム名の取得（優先順位: API取得 > チャンネル情報 > タイトル > 不明）
    game_name: (game && game.name) || channel.game_name || 'その他',
    title: stream.title,
    viewer_count: stream.viewer_count,
    language: stream.language,
    profile_image_url: profileImageUrl,
    thumbnail_url: profileImageUrl,
    tags: stream.tags || []
  };
});
  
  // 視聴者数でソート
// 視聴者数でソート
formattedStreams.sort((a, b) => b.viewer_count - a.viewer_count);
console.log(`Total streams after sorting: ${formattedStreams.length}`);

// 上位50件のみ返す
console.log(`Returning up to 50 streams`);
return formattedStreams.slice(0, 50);
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
