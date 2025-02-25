<?php
// CORSヘッダーを設定
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Twitch API認証情報
$clientId = '0q0t4u78p93nih8z1l2dek9fglpz23';
$clientSecret = '2wevk9sshtktaq2wkf09ao2j2em1lh';

// セッションを開始してトークンを保存
session_start();

/**
 * Twitchの認証トークンを取得する関数
 */
function getTwitchToken() {
    global $clientId, $clientSecret;
    
    // セッションにトークンが保存されているか確認
    if (isset($_SESSION['twitch_token']) && isset($_SESSION['token_expiry']) && 
        $_SESSION['token_expiry'] > time()) {
        return $_SESSION['twitch_token'];
    }
    
    // 新しいトークンを取得
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
    
    // トークンをセッションに保存
    $_SESSION['twitch_token'] = $data['access_token'];
    $_SESSION['token_expiry'] = time() + ($data['expires_in'] * 0.9); // 90%の時間を使用
    
    return $data['access_token'];
}

/**
 * Twitch APIにリクエストを送信する関数
 */
function twitchApiRequest($url, $params = []) {
    global $clientId;
    $token = getTwitchToken();
    
    $ch = curl_init();
    
    // パラメータを追加
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

// ストリームデータを取得
$streamsResponse = twitchApiRequest('https://api.twitch.tv/helix/streams', ['first' => 100]);

if (!isset($streamsResponse['data'])) {
    die(json_encode(['error' => 'Failed to fetch stream data']));
}

// ユーザーIDとゲームIDを収集
$userIds = [];
$gameIds = [];

foreach ($streamsResponse['data'] as $stream) {
    $userIds[] = $stream['user_id'];
    if (!empty($stream['game_id'])) {
        $gameIds[] = $stream['game_id'];
    }
}

// 重複を除去
$userIds = array_unique($userIds);
$gameIds = array_unique($gameIds);

// ユーザー情報を取得
$usersResponse = twitchApiRequest('https://api.twitch.tv/helix/users', ['id' => implode(',', $userIds)]);

// ゲーム情報を取得
$gamesResponse = [];
if (!empty($gameIds)) {
    $gamesResponse = twitchApiRequest('https://api.twitch.tv/helix/games', ['id' => implode(',', $gameIds)]);
}

// ユーザーデータをマップ
$usersMap = [];
if (isset($usersResponse['data'])) {
    foreach ($usersResponse['data'] as $user) {
        $usersMap[$user['id']] = $user;
    }
}

// ゲームデータをマップ
$gamesMap = [];
if (isset($gamesResponse['data'])) {
    foreach ($gamesResponse['data'] as $game) {
        $gamesMap[$game['id']] = $game;
    }
}

// ストリームデータを整形
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

// 視聴者数でソート
usort($streams, function($a, $b) {
    return $b['viewer_count'] - $a['viewer_count'];
});

// JSONとして出力
echo json_encode($streams);
