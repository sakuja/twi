import React from 'react';
import styles from '../styles/StreamCard.module.css';

const StreamCard = ({ stream }) => {
  // デバッグ情報をコンソールに出力
  console.log('Stream data in card:', stream);
  
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
        <div className={styles.titleContainer}>
          <h3 className={styles.title}>{stream.title}</h3>
          {stream.stream_duration ? (
            <span className={styles.duration}>{stream.stream_duration}</span>
          ) : (
            <span className={styles.duration}>配信時間不明</span>
          )}
        </div>
        <div className={styles.streamerInfo}>
          <span className={styles.name}>{stream.user_name}</span>
          <span className={styles.game}>{stream.game_name}</span>
        </div>
        <div className={styles.viewerCount}>
          <span>👁 {stream.viewer_count.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default StreamCard; 
