import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import StreamCard from '../components/StreamCard';

export default function Home() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firstStreamData, setFirstStreamData] = useState(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        console.log('Fetching streams from API...');
        const response = await fetch('/api/streams');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.length} streams from API`);
        
        if (data.length > 0) {
          console.log('First stream from API:', data[0]);
          setFirstStreamData(data[0]);
        }
        
        setStreams(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching streams:', error);
        setError(error.message);
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
    viewer_count: 1000,
    started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3時間前
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

      {/* デバッグ情報 */}
      <div style={{ marginBottom: '20px', border: '1px solid #444', padding: '10px', borderRadius: '5px' }}>
        <h3>デバッグ情報:</h3>
        <p>ステータス: {loading ? '読み込み中...' : error ? `エラー: ${error}` : `${streams.length}件のストリームを取得`}</p>
        
        {firstStreamData && (
          <div>
            <h4>最初のストリームデータ:</h4>
            <pre style={{ 
              backgroundColor: '#2a2a2a', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto',
              fontSize: '12px',
              maxHeight: '200px'
            }}>
              {JSON.stringify(firstStreamData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ストリーム一覧 */}
      {loading ? (
        <p>読み込み中...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>エラーが発生しました: {error}</p>
      ) : (
        <div>
          <h3>ストリーム一覧 ({streams.length}件):</h3>
          {streams.length === 0 ? (
            <p>ストリームが見つかりませんでした</p>
          ) : (
            streams.slice(0, 5).map(stream => (
              <StreamCard key={stream.id} stream={stream} />
            ))
          )}
        </div>
      )}
    </div>
  );
} 
