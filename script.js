// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // 要素の参照を取得
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const rankingsTable = document.getElementById('rankings');
    const rankingsBody = document.getElementById('rankings-body');
    const updateTimeElement = document.getElementById('update-time');
    
    // 数値をフォーマットする関数
    function formatNumber(num) {
        return new Intl.NumberFormat('ja-JP').format(num);
    }
    
    // 現在時刻を更新する関数
    function updateCurrentTime() {
        const now = new Date();
        updateTimeElement.textContent = now.toLocaleString('ja-JP');
    }
    
// テーブルを更新する関数
function updateTable(data) {
    console.log('Updating table with data');
    
    // テーブルの内容をクリア
    rankingsBody.innerHTML = '';
    
    // データをテーブルに挿入
    data.forEach((stream, index) => {
        const row = document.createElement('tr');
        
        // 上位3位にクラスを追加
        if (index < 3) {
            row.classList.add('top-rank');
        }
        
        // Twitchの配信URLを作成
        const twitchUrl = `https://twitch.tv/${stream.user_login}`;
        
        // ランク列
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        
        // ストリーマー列
        const streamerCell = document.createElement('td');
        const streamerDiv = document.createElement('div');
        streamerDiv.className = 'streamer-cell';
        
        const streamerLink = document.createElement('a');
        streamerLink.href = twitchUrl;
        streamerLink.target = '_blank';
        streamerLink.className = 'streamer-link';
        
        const thumbnail = document.createElement('img');
        thumbnail.src = stream.thumbnail_url || '/placeholder.jpg';
        thumbnail.alt = stream.user_name;
        thumbnail.className = 'streamer-thumbnail';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = stream.user_name;
        
        streamerLink.appendChild(thumbnail);
        streamerLink.appendChild(nameSpan);
        streamerDiv.appendChild(streamerLink);
        streamerCell.appendChild(streamerDiv);
        
        // ゲーム列
        const gameCell = document.createElement('td');
        const gameLink = document.createElement('a');
        gameLink.href = twitchUrl;
        gameLink.target = '_blank';
        gameLink.className = 'game-link';
        gameLink.textContent = stream.game_name || 'N/A';
        gameCell.appendChild(gameLink);
        
        // 視聴者数列
        const viewerCell = document.createElement('td');
        viewerCell.className = 'viewer-count';
        viewerCell.textContent = formatNumber(stream.viewer_count);
        
        // 行に各セルを追加
        row.appendChild(rankCell);
        row.appendChild(streamerCell);
        row.appendChild(gameCell);
        row.appendChild(viewerCell);
        
        // テーブルに行を追加
        rankingsBody.appendChild(row);
    });
    
    // ローディングを非表示、テーブルを表示
    if (loadingElement) loadingElement.style.display = 'none';
    if (rankingsTable) rankingsTable.style.display = 'table';
    
    // 更新時刻を設定
    updateCurrentTime();
    
    console.log('Table updated successfully');
}
    
    // エラー表示関数
    function showError(message) {
        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) {
            errorElement.textContent = message || 'データの取得に失敗しました';
            errorElement.style.display = 'block';
        }
    }
    
    // APIからデータを取得する関数
    async function fetchData() {
        try {
            // ローディング表示、エラーとテーブルを非表示
            if (loadingElement) loadingElement.style.display = 'block';
            if (errorElement) errorElement.style.display = 'none';
            if (rankingsTable) rankingsTable.style.display = 'none';
            
            console.log('Fetching data from API...');
            
            // APIからデータを取得
            const response = await fetch('/api/streams');
            
            // レスポンスのステータスをチェック
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            // JSONデータを解析
            const data = await response.json();
            console.log('Data received from API');
            
            // テーブルを更新
            updateTable(data);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            showError(error.message);
        }
    }
    
    // 初回データ取得
    fetchData();
    
    // 60秒ごとにデータを更新
    setInterval(fetchData, 60000);
});
