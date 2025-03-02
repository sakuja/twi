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
      
      return `${hours}時間${minutes}分`;
    } catch (error) {
      console.error('配信時間計算エラー:', error);
      return '計算エラー';
    }
  };
  
  // 配信時間を計算
  const duration = stream.stream_duration || (stream.started_at ? calculateDuration(stream.started_at) : '時間不明');
  
  return (



    
  );
};

export default StreamCard;
