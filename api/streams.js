const axios = require('axios');

// キャッシュ設定
let twitchToken = null;
let tokenExpiry = null;
let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = process.env.CACHE_DURATION_MS ? parseInt(process.env.CACHE_DURATION_MS, 10) : 120000; // デフォルト2分

// デモデータ
function getDemoData() {
  return [
    { user_name: "ストリーマー1", user_login: "streamer1", viewer_count: 45000, game_name: "フォートナイト", thumbnail_url: "https://via.placeholder.com/40" },
    { user_name: "ストリーマー2", user_login: "streamer2", viewer_count: 38000, game_name: "Apex Legends", thumbnail_url: "https://via.placeholder.com/40" },
  ];
}

// Twitchの認証トークンを取得
async function getTwitchToken() {
  if (twitchToken && tokenExpiry && Date.now() < tokenExpiry) return twitchToken;
  const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });
  twitchToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 900;
  return twitchToken;
}

// Twitchストリームデータを取得
async function fetchTwitchStreams(token) {
  const { data } = await axios.get('https://api.twitch.tv/helix/streams', {
    headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
    params: { first: 100 }
  });
  return data.data.filter(stream => stream.language === 'ja');
}

// ユーザー情報を一括取得
async function fetchTwitchUsers(userLogins, token) {
  const userBatches = [];
  for (let i = 0; i < userLogins.length; i += 100) userBatches.push(userLogins.slice(i, i + 100));
  let allUsers = [];
  for (const batch of userBatches) {
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
      params: { login: batch.join(',') }
    });
    allUsers.push(...response.data.data);
  }
  return allUsers;
}

// ストリームデータを整形
async function processStreams(streams, token) {
  const userLogins = streams.map(stream => stream.user_login);
  const users = await fetchTwitchUsers(userLogins, token);
  return streams.map(stream => {
    const user = users.find(u => u.id === stream.user_id) || {};
    return {
      id: stream.id,
      user_id: stream.user_id,
      user_name: stream.user_name,
      user_login: stream.user_login,
      game_id: stream.game_id,
      game_name: stream.title || 'Unknown Game',
      title: stream.title,
      viewer_count: stream.viewer_count,
      language: stream.language,
      profile_image_url: user.profile_image_url || `https://placehold.co/40x40?text=${stream.user_name.charAt(0)}`,
      tags: stream.tags || []
    };
  }).sort((a, b) => b.viewer_count - a.viewer_count);
}

// APIエンドポイント
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
      return res.status(200).json(cachedData);
    }
    const token = await getTwitchToken();
    const streams = await fetchTwitchStreams(token);
    const processedData = await processStreams(streams, token);
    cachedData = processedData;
    cacheTime = Date.now();
    return res.status(200).json(processedData);
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(200).json(getDemoData());
  }
};
