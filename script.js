// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    // 要素の参照を取得
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const rankingsTable = document.getElementById('rankings');
    const rankingsBody = document.getElementById('rankings-body');
    const updateTimeElement = document.getElementById('update-time');
    
    // データを取得する関数
    async function fetchData() {
        try {
            // ローディング表示、エラーとテーブルを非表示
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';
            rankingsTable.style.display = 'none';
            
            // APIからデータを取得（Vercel用に修正）
            const response = await fetch('/api/streams');
            
            // レスポンスのステータスをチェック
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            // JSONデータを解析
            const data = await response.json();
            
            // テーブルを更新
            updateTable(data);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            showError(error.message);
            
            // エラーが発生した場合はデモデータを表示
            loadDemoData();
        }
    }
    
    // デモ用：APIが実装されるまで使用するダミーデータ
    function loadDemoData() {
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
    
    // 初回データ取得の代わりにデモデータを表示（一時的な対応）
    loadDemoData();
    
    // API実装後はこちらを有効化
    // fetchData();
    // setInterval(fetchData, 60000);
});
