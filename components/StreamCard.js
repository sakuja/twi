import React, { useState, useEffect } from 'react';
import styles from '../styles/StreamCard.module.css';

const StreamCard = ({ stream }) => {
  const [duration, setDuration] = useState('配信時間不明');
  
  // 配信時間を計算する関数
  const calculateDuration = (startedAt) => {
    if (!startedAt) return '配信時間不明';
    
    try {
      const startTime = new Date(startedAt);
      if (isNaN(startTime.getTime())) return '配信時間不明';
      
      const now = new Date();
      const durationMs = now - startTime;
      
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}時間${minutes}分`;
      } else {
        return `${minutes}分`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error);
      return '配信時間不明';
    }
  };
  
  // コンポーネントがマウントされたときにデバッグ情報を出力
  useEffect(() => {
    console.log('Stream data in card:', {
      user_name: stream.user_name,
      started_at: stream.started_at
    });
    
    // started_atフィールドがある場合は配信時間を計算
    if (stream.started_at) {
      setDuration(calculateDuration(stream.started_at));
      
      // 1分ごとに配信時間を更新
      const intervalId = setInterval(() => {
        setDuration(calculateDuration(stream.started_at));
      }, 60000);
      
      return () => clearInterval(intervalId);
    }
  }, [stream]);
  
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
          <span className={styles.duration}>{duration}</span>
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
