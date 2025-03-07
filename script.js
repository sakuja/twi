// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // 配信時間の色を決定する関数
    function getDurationColor(durationText) {
        // 配信時間からデータを抽出する
        let hours = 0;
        let minutes = 0;
        
        if (!durationText || durationText === '配信時間不明') {
            return '#808080'; // 不明な場合はグレー
        }
        
        // 時間と分を抽出
        const hoursMatch = durationText.match(/(\d+)時間/);
        const minutesMatch = durationText.match(/(\d+)分/);
        
        if (hoursMatch) {
            hours = parseInt(hoursMatch[1], 10);
        }
        
        if (minutesMatch) {
            minutes = parseInt(minutesMatch[1], 10);
        }
        
        // 総時間（分）を計算
        const totalMinutes = hours * 60 + minutes;
        
        // 条件に基づいて色を返す
        if (totalMinutes < 60) {
            return '#4CAF50'; // 1-59分: 緑色
        } else if (totalMinutes < 180) {
            return '#808080'; // 1-3時間: 青色 #2196F3
        } else if (totalMinutes < 480) {
            return '#808080'; // 3-8時間: オレンジ色#FF9800
        } else {
            return '#F44336'; // 8時間以上: 赤色
        }
    }
    
    // 要素の参照を取得
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const rankingsTable = document.getElementById('rankings');
    const rankingsBody = document.getElementById('rankings-body');
    const updateTimeElement = document.getElementById('update-time');
    const page1Button = document.getElementById('page1');
    const page2Button = document.getElementById('page2');
    
    // 現在のページ状態を保持
    let currentPage = 1; // デフォルトは1ページ目
    let allStreamData = []; // 全てのストリームデータを保持
    
    // 数値をフォーマットする関数
    function formatNumber(num) {
        return new Intl.NumberFormat('ja-JP').format(num);
    }
    
    // 現在時刻を更新する関数
    function updateCurrentTime() {
        const now = new Date();
        updateTimeElement.textContent = now.toLocaleString('ja-JP');
    }
    
    // ページネーションの設定
    function setupPagination() {
        // ページ1ボタンのクリックイベント
        page1Button.addEventListener('click', () => {
            if (currentPage !== 1) {
                currentPage = 1;
                updatePageButtons();
                renderCurrentPageData();
            }
        });
        
        // ページ2ボタンのクリックイベント
        page2Button.addEventListener('click', () => {
            if (currentPage !== 2) {
                currentPage = 2;
                updatePageButtons();
                renderCurrentPageData();
            }
        });
    }
    
    // ページボタンの見た目を更新
    function updatePageButtons() {
        // すべてのボタンからactiveクラスを削除
        page1Button.classList.remove('active');
        page2Button.classList.remove('active');
        
        // 現在のページのボタンにactiveクラスを追加
        if (currentPage === 1) {
            page1Button.classList.add('active');
        } else {
            page2Button.classList.add('active');
        }
    }
    
    // 現在のページに応じたデータをレンダリング
    function renderCurrentPageData() {
        if (allStreamData.length === 0) {
            return; // データがなければ何もしない
        }
        
        // 表示するデータの範囲を決定
        const startIndex = (currentPage - 1) * 50;
        const endIndex = startIndex + 50;
        const pageData = allStreamData.slice(startIndex, endIndex);
        
        // テーブルを更新
        updateTable(pageData);
    }
    
    // テーブルを更新する関数
    function updateTable(data) {
        console.log('Updating table with data');

        // タイトルを省略する関数を追加
　　function truncateTitle(title, maxLength = 80) { //変更点 30→80
    if (!title) return 'No Title';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
}
        
        // テーブルの内容をクリア
        rankingsBody.innerHTML = '';
        
        // データをテーブルに挿入
        data.forEach((stream, index) => {
            // 実際の順位を計算
            const rank = (currentPage - 1) * 50 + index + 1;
            
            // Twitchの配信URLを作成
            const twitchUrl = `https://twitch.tv/${stream.user_login}`;
            
            const row = document.createElement('tr');
            if (rank <= 3) {
                row.classList.add('top-rank');
            }
            
            // 行の内容を作成
// script.jsの行生成部分（updateTable関数内）を以下のように修正：
row.innerHTML = `
    <td>${rank}</td>
    <td>
        <div class="streamer-cell">
            <img src="${stream.profile_image_url}" 
                 alt="" 
                 class="streamer-thumbnail"
                 onerror="this.onerror=null; this.src='https://placehold.co/40x40/6441a5/FFFFFF/webp?text=${stream.user_name.charAt(0).toUpperCase()}';">
            <div class="streamer-info">
                <a href="${twitchUrl}" target="_blank" class="streamer-name">
                    ${stream.user_name}
                </a>
                <a href="https://www.twitch.tv/directory/game/${encodeURIComponent(stream.game_name)}" target="_blank" class="streamer-category">
                    ${stream.game_name || 'その他'}
                </a>
            </div>
        </div>
    </td>
    <td>
        <div style="position: relative;">
            <a href="${twitchUrl}" target="_blank" class="game-link" title="${stream.title || 'No Title'}">
                ${truncateTitle(stream.title, 80)}
            </a>
            <span class="stream-duration" style="position: absolute; bottom: -15px; right: 0; color: ${getDurationColor(stream.stream_duration)}">${stream.stream_duration || ''}</span>
        </div>
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
            
            // 全てのデータを保存
            allStreamData = data;
            
            // 現在のページのデータを表示
            renderCurrentPageData();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            showError(error.message);
        }
    }
    
    // 初回データ取得の前にページネーションをセットアップ
    setupPagination();
    
    // 初回データ取得
    fetchData();
    
    // 60秒ごとにデータを更新
    setInterval(fetchData, 60000);
});
