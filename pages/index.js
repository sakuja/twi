import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import StreamCard from '../components/StreamCard';

export default function Home() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const response = await fetch('/api/streams');
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched streams:', data.length);
          setStreams(data);
        } else {
          console.error('API error:', response.status);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, []);

  // テスト用のダミーデータ
  const dummyStream = {
    id: 'test123',
    user_name: 'テストユーザー',
    title: 'これはテスト配信です',
    profile_image_url: 'https://placehold.co/40x40/6441a5/FFFFFF/webp?text=T',
    viewer_count: 1000
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto', 
      backgroundColor: '#0e0e10', 
      color: '#efeff1' 
    }}>
      <Head>
        <title>Twitchストリーム</title>
      </Head>

      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Twitchストリーム</h1>
      
      {/* テスト用のダミーカード */}
      <div style={{ marginBottom: '20px', border: '2px solid red', padding: '5px' }}>
        <h2 style={{ color: 'red' }}>テストカード:</h2>
        <StreamCard stream={dummyStream} />
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div>
          <p>取得したストリーム数: {streams.length}</p>
          {streams.slice(0, 5).map(stream => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </div>
  );
} 
