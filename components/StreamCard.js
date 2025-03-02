import React from 'react';

const StreamCard = ({ stream }) => {
  // 配信時間を計算する関数
  const calculateDuration = (startedAt) => {
    if (!startedAt) return '時間不明';
    
    try {
      const startTime = new Date(startedAt);
      const currentTime = new Date();
      const durationMs = currentTime - startTime;
      
      // ミリ秒を時間と分に変換
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log(`配信開始時間: ${startedAt}`);
      console.log(`現在時間: ${currentTime.toISOString()}`);
      console.log(`配信時間(ms): ${durationMs}`);
      console.log(`配信時間: ${hours}時間${minutes}分`);
      
      return `${hours}時間${minutes}分`;
    } catch (error) {
      console.error('配信時間計算エラー:', error);
      return '計算エラー';
    }
  };

  // ストリームデータをコンソールに出力（デバッグ用）
  console.log('StreamCard - stream data:', stream);
  
  // 配信時間を計算
  const duration = stream.started_at ? calculateDuration(stream.started_at) : '時間不明';
  
  return (
    <div style={{ 
      display: 'flex', 
      padding: '10px', 
      marginBottom: '10px', 
      backgroundColor: '#1f1f23', 
      borderRadius: '5px'
    }}>
      <div style={{ marginRight: '10px' }}>
        <img 
          src={stream.profile_image_url} 
          alt="プロフィール画像" 
          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ position: 'relative', marginBottom: '5px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '0.9rem', 
            color: '#efeff1',
            paddingRight: '70px'
          }}>
            {stream.title}
          </h3>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            backgroundColor: 'red',
            color: 'white',
            padding: '3px 6px',
            borderRadius: '3px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            {duration}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#adadb8' }}>{stream.user_name}</span>
        </div>
      </div>
    </div>
  );
};

export default StreamCard;
