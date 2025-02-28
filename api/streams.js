require('dotenv').config();
const axios = require('axios');

let accessToken = null;
let tokenExpiry = 0;
let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

const getTwitchToken = async () => {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        throw new Error('Twitch API credentials are missing');
    }
    if (accessToken && Date.now() < tokenExpiry) return accessToken;

    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });
        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.9); // 安全マージン
        return accessToken;
    } catch (error) {
        console.error('Error fetching Twitch token:', error.response?.data || error.message);
        throw new Error('Failed to obtain Twitch API token');
    }
};

const fetchTwitchStreams = async (language = 'ja') => {
    try {
        const token = await getTwitchToken();
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                game_id: '12345', // ここを適切なゲームIDに変更
                language: language,
                first: 10
            }
        });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching Twitch streams:', error.response?.data || error.message);
        return [];
    }
};

const getUserData = async (userIds) => {
    if (userIds.length === 0) return [];
    try {
        const token = await getTwitchToken();
        const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: { id: userIds }
        });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching Twitch user data:', error.response?.data || error.message);
        return [];
    }
};

const processStreams = async () => {
    if (Date.now() - cacheTime < CACHE_TTL_MS) return cache;
    
    let streams = await fetchTwitchStreams('ja');
    if (streams.length === 0) {
        console.warn('No Japanese streams found. Fetching all streams.');
        streams = await fetchTwitchStreams();
    }
    
    const userIds = streams.map(s => s.user_id);
    const userData = await getUserData(userIds);
    
    const userMap = Object.fromEntries(userData.map(user => [user.id, user]));
    const enrichedStreams = streams.map(stream => ({
        id: stream.id,
        title: stream.title,
        viewer_count: stream.viewer_count,
        user_name: userMap[stream.user_id]?.display_name || stream.user_name,
        profile_image_url: userMap[stream.user_id]?.profile_image_url || 'https://placehold.co/100',
        thumbnail_url: stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180')
    }));
    
    cache = enrichedStreams;
    cacheTime = Date.now();
    return enrichedStreams;
};

module.exports = async (req, res) => {
    try {
        const streams = await processStreams();
        res.status(200).json({ success: true, data: streams });
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
