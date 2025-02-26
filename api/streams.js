const axios = require('axios');

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
    
    // 環境変数を確認
    console.log('CLIENT_ID available:', !!process.env.TWITCH_CLIENT_ID);
    console.log('CLIENT_SECRET available:', !!process.env.TWITCH_CLIENT_SECRET);
    
    // トークン認証のみをテスト
    try {
      console.log('Attempting to get Twitch token...');
      const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials'
        }
      });
      
      console.log('Token response received:', !!tokenResponse.data.access_token);
      
      // 成功した場合、トークンだけを返す（テスト用）
      return res.status(200).json({ 
        success: true, 
        message: "Auth successful! Token received.",
        demoData: getDemoData()
      });
      
    } catch (error) {
      console.error('Auth error details:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // 認証に失敗してもデモデータを返す
      return res.status(200).json({ 
        success: false, 
        error: error.message,
        message: "Auth failed, but here's demo data",
        demoData: getDemoData()
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return res.status(200).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: error.message,
      demoData: getDemoData()
    });
  }
};

// デモデータを返す関数
function getDemoData() {
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
