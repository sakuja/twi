// �K�v�ȃ��W���[�����C���|�[�g
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Express�A�v���P�[�V�������쐬
const app = express();
const PORT = process.env.PORT || 3000;

// �~�h���E�F�A
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Twitch API�̔F�؏��
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

// Twitch��OAuth�g�[�N����ۑ�����ϐ�
let twitchToken = null;
let tokenExpiry = null;

// Twitch�̔F�؃g�[�N�����擾����֐�
async function getTwitchToken() {
    // �g�[�N�����L���Ȃ�ė��p
    if (twitchToken && tokenExpiry && Date.now() < tokenExpiry) {
        return twitchToken;
    }
    
    try {
        // Twitch�̔F��API�Ƀ��N�G�X�g
        const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
            params: {
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });
        
        // �g�[�N����ۑ�
        twitchToken = response.data.access_token;
        // �L��������ݒ�i�ʏ�͖�60�������A�O�̂��ߏ����Z�߂ɐݒ�j
        tokenExpiry = Date.now() + (response.data.expires_in * 900); // 90%�̎��Ԃ��g�p
        
        return twitchToken;
    } catch (error) {
        console.error('Failed to get Twitch token:', error);
        throw new Error('Twitch authentication failed');
    }
}

// Twitch�̃X�g���[�~���O�f�[�^���擾����API
app.get('/api/streams', async (req, res) => {
    try {
        // �F�؃g�[�N�����擾
        const token = await getTwitchToken();
        
        // Twitch API�Ƀ��N�G�X�g�i�g�b�v�X�g���[�����擾�j
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                first: 100 // �ő�100���̃X�g���[�����擾
            }
        });
        
        // ���[�U�[���ƃQ�[�������擾���邽�߂�ID���W�߂�
        const userIds = response.data.data.map(stream => stream.user_id);
        const gameIds = [...new Set(response.data.data.map(stream => stream.game_id).filter(id => id))];
        
        // ���[�U�[�����擾
        const usersResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                id: userIds.join(',')
            }
        });
        
        // �Q�[�������擾
        const gamesResponse = await axios.get('https://api.twitch.tv/helix/games', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                id: gameIds.join(',')
            }
        });
        
        // ���[�U�[�f�[�^���}�b�v
        const usersMap = {};
        usersResponse.data.data.forEach(user => {
            usersMap[user.id] = user;
        });
        
        // �Q�[���f�[�^���}�b�v
        const gamesMap = {};
        gamesResponse.data.data.forEach(game => {
            gamesMap[game.id] = game;
        });
        
        // �X�g���[���f�[�^�𐮌`
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
        
        // �����Ґ��Ń\�[�g
        streams.sort((a, b) => b.viewer_count - a.viewer_count);
        
        // �N���C�A���g�Ɍ��ʂ�Ԃ�
        res.json(streams);
    } catch (error) {
        console.error('Error fetching streams:', error);
        res.status(500).json({ error: 'Failed to fetch stream data' });
    }
});

// �T�[�o�[���N��
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});