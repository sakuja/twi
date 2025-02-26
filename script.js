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
        console.log('Updating table with data:', data);
        
        // テーブルの内容をクリア
        rankingsBody.innerHTML = '';
        
        // データをテーブルに挿入
        data.forEach((stream, index) => {
            const row = document.createElement('tr');
            
            // 上位3位にクラスを追加
            if (index < 3) {
                row.classList.add('top-rank');
            }
            
            // 行の内容を作成
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="streamer-cell">
                        <img src="${stream.thumbnail_url || '/placeholder.jpg'}" alt="${stream.user_name}" class="streamer-thumbnail">
                        <span>${stream.user_name}</span>
                    </div>
                </td>
                <td>${stream.game_name || 'N/A'}</td>
                <td class="viewer-count">${formatNumber(stream.viewer_count)}</td>
            `;
            
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
        // エラー発生時にデモデータを表示
        loadDemoData();
    }
    
    // デモ用：APIが実装されるまで使用するダミーデータを表示
    function loadDemoData() {
        console.log('Loading demo data');
        const demoData = [
            { user_name: "ストリーマー1", user_login: "streamer1", viewer_count: 45000, game_name: "フォートナイト", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー2", user_login: "streamer2", viewer_count: 38000, game_name: "Apex Legends", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー3", user_login: "streamer3", viewer_count: 32000, game_name: "Minecraft", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー4", user_login: "streamer4", viewer_count: 25000, game_name: "リーグ・オブ・レジェンド", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー5", user_login: "streamer5", viewer_count: 20000, game_name: "大乱闘スマッシュブラザーズ", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー6", user_login: "streamer6", viewer_count: 18000, game_name: "Valorant", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー7", user_login: "streamer7", viewer_count: 15000, game_name: "原神", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー8", user_login: "streamer8", viewer_count: 12000, game_name: "ポケットモンスター", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー9", user_login: "streamer9", viewer_count: 10000, game_name: "Among Us", thumbnail_url: "https://via.placeholder.com/40" },
            { user_name: "ストリーマー10", user_login: "streamer10", viewer_count: 9000, game_name: "Call of Duty", thumbnail_url: "https://via.placeholder.com/40" },
        ];
        
        // デモデータでテーブルを更新
        updateTable(demoData);
    }
    
    // APIからデータを取得する
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
        const responseData = await response.json();
        console.log('Received data from API:', responseData);
        
        // 新しいAPIレスポンス形式に対応
        let data;
        if (responseData.demoData) {
            // 新しい形式：demoDataプロパティから取得
            data = responseData.demoData;
        } else if (Array.isArray(responseData)) {
            // 古い形式：直接配列
            data = responseData;
        } else {
            throw new Error('不正なデータ形式を受信しました');
        }
        
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
