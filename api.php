<?php
// CORS�w�b�_�[��ݒ�
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Twitch API�F�؏��
$clientId = '0q0t4u78p93nih8z1l2dek9fglpz23';
$clientSecret = 'y8prq5lf3w7m5jo67hibkv8ei8xdra';

// �Z�b�V�������J�n���ăg�[�N����ۑ�
session_start();

/**
 * Twitch�̔F�؃g�[�N�����擾����֐�
 */
function getTwitchToken() {
    global $clientId, $clientSecret;
    
    // �Z�b�V�����Ƀg�[�N�����ۑ�����Ă��邩�m�F
    if (isset($_SESSION['twitch_token']) && isset($_SESSION['token_expiry']) && 
        $_SESSION['token_expiry'] > time()) {
        return $_SESSION['twitch_token'];
    }
    
    // �V�����g�[�N�����擾
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, 'https://id.twitch.tv/oauth2/token');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'grant_type' => 'client_credentials'
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        die(json_encode(['error' => 'Twitch authentication failed: ' . curl_error($ch)]));
    }
    
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    if (!isset($data['access_token'])) {
        die(json_encode(['error' => 'Invalid response from Twitch API']));
    }
    
    // �g�[�N�����Z�b�V�����ɕۑ�
    $_SESSION['twitch_token'] = $data['access_token'];
    $_SESSION['token_expiry'] = time() + ($data['expires_in'] * 0.9); // 90%�̎��Ԃ��g�p
    
    return $data['access_token'];
}

/**
 * Twitch API�Ƀ��N�G�X�g�𑗐M����֐�
 */
function twitchApiRequest($url, $params = []) {
    global $clientId;
    $token = getTwitchToken();
    
    $ch = curl_init();
    
    // �p�����[�^��ǉ�
    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Client-ID: ' . $clientId,
        'Authorization: Bearer ' . $token
    ]);
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        die(json_encode(['error' => 'Twitch API request failed: ' . curl_error($ch)]));
    }
    
    curl_close($ch);
    
    return json_decode($response, true);
}

// �X�g���[���f�[�^���擾
$streamsResponse = twitchApiRequest('https://api.twitch.tv/helix/streams', ['first' => 100]);

if (!isset($streamsResponse['data'])) {
    die(json_encode(['error' => 'Failed to fetch stream data']));
}

// ���[�U�[ID�ƃQ�[��ID�����W
$userIds = [];
$gameIds = [];

foreach ($streamsResponse['data'] as $stream) {
    $userIds[] = $stream['user_id'];
    if (!empty($stream['game_id'])) {
        $gameIds[] = $stream['game_id'];
    }
}

// �d��������
$userIds = array_unique($userIds);
$gameIds = array_unique($gameIds);

// ���[�U�[�����擾
$usersResponse = twitchApiRequest('https://api.twitch.tv/helix/users', ['id' => implode(',', $userIds)]);

// �Q�[�������擾
$gamesResponse = [];
if (!empty($gameIds)) {
    $gamesResponse = twitchApiRequest('https://api.twitch.tv/helix/games', ['id' => implode(',', $gameIds)]);
}

// ���[�U�[�f�[�^���}�b�v
$usersMap = [];
if (isset($usersResponse['data'])) {
    foreach ($usersResponse['data'] as $user) {
        $usersMap[$user['id']] = $user;
    }
}

// �Q�[���f�[�^���}�b�v
$gamesMap = [];
if (isset($gamesResponse['data'])) {
    foreach ($gamesResponse['data'] as $game) {
        $gamesMap[$game['id']] = $game;
    }
}

// �X�g���[���f�[�^�𐮌`
$streams = [];
foreach ($streamsResponse['data'] as $stream) {
    $user = isset($usersMap[$stream['user_id']]) ? $usersMap[$stream['user_id']] : [];
    $game = isset($gamesMap[$stream['game_id']]) ? $gamesMap[$stream['game_id']] : [];
    
    $streams[] = [
        'id' => $stream['id'],
        'user_id' => $stream['user_id'],
        'user_name' => $stream['user_name'],
        'user_login' => $stream['user_login'],
        'game_id' => $stream['game_id'],
        'game_name' => isset($game['name']) ? $game['name'] : 'Unknown Game',
        'title' => $stream['title'],
        'viewer_count' => (int)$stream['viewer_count'],
        'started_at' => $stream['started_at'],
        'language' => $stream['language'],
        'thumbnail_url' => isset($user['profile_image_url']) ? $user['profile_image_url'] : '',
        'tags' => isset($stream['tags']) ? $stream['tags'] : []
    ];
}

// �����Ґ��Ń\�[�g
usort($streams, function($a, $b) {
    return $b['viewer_count'] - $a['viewer_count'];
});

// JSON�Ƃ��ďo��
echo json_encode($streams);