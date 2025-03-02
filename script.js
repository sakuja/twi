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
        // Twitchの配信URLを作成
        const twitchUrl = `https://twitch.tv/${stream.user_login}`;
        
        // 簡易的なプロフィール画像の作成（初期のみ）
        const initialImage = `https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${stream.user_name.charAt(0).toUpperCase()}`;
        
        const row = document.createElement('tr');
        if (index < 3) {
            row.classList.add('top-rank');
        }
        
     // 行の内容を作成
// テーブル更新関数内の行生成部分
row.innerHTML = `
    <td>${index + 1}</td>
    <td>
        <a href="${twitchUrl}" target="_blank" class="streamer-link">
            <div class="streamer-cell">
                <img src="${stream.profile_image_url}" 
                     alt="" 
                     class="streamer-thumbnail"
                     onerror="this.onerror=null; this.src='https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${stream.user_name.charAt(0).toUpperCase()}';">
                <span>${stream.user_name}</span>
            </div>
        </a>
    </td>
    <td>
        <div style="position: relative;">
            <a href="${twitchUrl}" target="_blank" class="game-link">
                ${stream.title || 'No Title'}
            </a>
            <span class="stream-duration" style="position: absolute; bottom: -15px; right: 0;">${stream.stream_duration || ''}</span>
        </div>
    </td>
    <td>
        <a href="https://www.twitch.tv/directory/game/${encodeURIComponent(stream.game_name)}" target="_blank" class="category-link">
            ${stream.game_name || 'その他'}
        </a>
    </td>
    <td class="viewer-count">${formatNumber(stream.viewer_count)}</td>
`;
        
        rankingsBody.appendChild(row);
    });
    
    // ローディングを非表示、テーブルを表示
    if (loadingElement) loadingElement.style.display = 'none';
    if (rankingsTable) rankingsTable.style.display = 'table';
    
    // 更新時刻を設定
    updateCurrentTime();
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
