import React from 'react';

const StreamCard = ({ stream }) => {
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
            配信時間テスト
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
