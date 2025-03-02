import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import StreamCard from '../components/StreamCard';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/streams');
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        const data = await response.json();
        setStreams(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching streams:', error);
        setError('ストリーム情報の取得に失敗しました。');
        setLoading(false);
      }
    };

    fetchStreams();
    
    // 5分ごとに更新
    const intervalId = setInterval(fetchStreams, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>日本語Twitchストリーム</title>
        <meta name="description" content="人気の日本語Twitchストリーム" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          日本語Twitchストリーム
        </h1>

        {loading ? (
          <p className={styles.loading}>読み込み中...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <div className={styles.grid}>
            {streams.map(stream => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Powered by Twitch API</p>
      </footer>
    </div>
  );
} 
