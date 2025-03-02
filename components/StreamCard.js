import React from 'react';
import styles from '../styles/StreamCard.module.css';

const StreamCard = ({ stream }) => {
  // デバッグ情報をコンソールに出力
  console.log('Stream data in card:', stream);
  
  // 配信時間を計算する関数
  const calculateDuration = (startedAt) => {
    if (!startedAt) return "時間不明";
    
    try {
      const startTime = new Date(startedAt);
      if (isNaN(startTime.getTime())) {
        console.error(`Invalid date format: ${startedAt}`);
        return "時間不明";
      }
      
      const now = new Date();
      const durationMs = now - startTime;
      
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return "時間不明";
    }
  };
  
  // 配信時間を動的に適用
  const duration = stream.started_at ? calculateDuration(stream.started_at) : "時間不明";
  
  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <img 
          src={stream.profile_image_url} 
          alt={`${stream.user_name}のプロフィール画像`} 
          className={styles.profileImage} 
        />
      </div>
      <div className={styles.content}>
        <div style={{ position: 'relative', marginBottom: '5px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            color: '#efeff1',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingRight: '70px'
          }}>
            {stream.title}
          </h3>
          <span style={{ 
            position: 'absolute', 
            bottom: 0, 
            right: 0, 
            fontSize: '0.7rem', 
            color: '#ffffff', 
            backgroundColor: 'rgba(100, 65, 165, 0.8)',
            padding: '2px 5px',
            borderRadius: '3px',
            zIndex: 1
          }}>
            {duration}
          </span>
        </div>
        <div className={styles.streamerInfo}>
          <span className={styles.name}>{stream.user_name}</span>
          <span className={styles.game}>{stream.game_name}</span>
        </div>
        <div className={styles.viewerCount}>
          <span>👁 {stream.viewer_count ? stream.viewer_count.toLocaleString() : "0"}</span>
        </div>
        {/* デバッグ情報 */}
        <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
          開始時間: {stream.started_at || 'なし'}
        </div>
      </div>
    </div>
  );
};

export default StreamCard;
