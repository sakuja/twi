async function fetchTwitchStreams(token) {
  try {
    console.log('Fetching streams from Twitch API');
    const streamsResponse = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      params: {
        first: 100
      }
    });
    
    if (!streamsResponse.data || !streamsResponse.data.data) {
      throw new Error('Invalid streams response');
    }
    
    const streams = streamsResponse.data.data;
    console.log(`Retrieved ${streams.length} streams`);
    
    if (streams.length === 0) {
      return [];
    }
    
    // ユーザー情報を取得 - 一度に最大100個までのIDを処理
    console.log('Fetching user information');
    const userIds = streams.map(stream => stream.user_id);
    
    // ユーザーIDのバッチ処理（100個ずつに分割）
    const userBatches = [];
    for (let i = 0; i < userIds.length; i += 100) {
      userBatches.push(userIds.slice(i, i + 100));
    }
    
    let allUsers = [];
    for (const batch of userBatches) {
      try {
        const usersResponse = await axios.get('https://api.twitch.tv/helix/users', {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`
          },
          params: {
            id: batch.join(',')
          }
        });
        
        if (usersResponse.data && usersResponse.data.data) {
          allUsers = [...allUsers, ...usersResponse.data.data];
        }
      } catch (error) {
        console.error('Error fetching user batch:', error.message);
        // エラーが発生しても処理を続行
      }
    }
    
    // ゲーム情報を取得 - 同様にバッチ処理
    console.log('Fetching game information');
    const gameIds = [...new Set(streams.map(stream => stream.game_id).filter(id => id))];
    
    // ゲームIDのバッチ処理
    const gameBatches = [];
    for (let i = 0; i < gameIds.length; i += 100) {
      gameBatches.push(gameIds.slice(i, i + 100));
    }
    
    let allGames = [];
    for (const batch of gameBatches) {
      if (batch.length === 0) continue;
      
      try {
        const gamesResponse = await axios.get('https://api.twitch.tv/helix/games', {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`
          },
          params: {
            id: batch.join(',')
          }
        });
        
        if (gamesResponse.data && gamesResponse.data.data) {
          allGames = [...allGames, ...gamesResponse.data.data];
        }
      } catch (error) {
        console.error('Error fetching game batch:', error.message);
        // エラーが発生しても処理を続行
      }
    }
    
    // マッピング用のオブジェクトを作成
    const usersMap = {};
    allUsers.forEach(user => {
      usersMap[user.id] = user;
    });
    
    const gamesMap = {};
    allGames.forEach(game => {
      gamesMap[game.id] = game;
    });
    
    // データを整形
    const formattedStreams = streams.map(stream => {
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
        language: stream.language,
        thumbnail_url: user.profile_image_url || '',
        tags: stream.tags || []
      };
    });
    
    // 視聴者数でソート
    formattedStreams.sort((a, b) => b.viewer_count - a.viewer_count);
    console.log('Successfully processed stream data');
    
    return formattedStreams;
  } catch (error) {
    console.error('Error in fetchTwitchStreams:', error.message);
    throw error;
  }
}
