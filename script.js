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
    const categorySelect = document.getElementById('category-select');
    
    // 現在のページ状態を保持
    let currentPage = 1; // デフォルトは1ページ目
    let allStreamData = []; // 全てのストリームデータを保持
    let currentCategoryId = ''; // 現在選択されているカテゴリID
    let categories = []; // カテゴリ一覧を保持
    
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
        function truncateTitle(title, maxLength = 80) { 
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
            row.innerHTML = `
                <td>${rank}</td>
                <td>
                    <div class="streamer-cell">
                        <img src="${stream.profile_image_url || stream.thumbnail_url}" 
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
    
    // カテゴリ一覧を取得する関数
    async function fetchCategories() {
        try {
            console.log('Fetching categories from API...');
            
            // サーバーAPIからカテゴリ一覧を取得
            const response = await fetch('/api/categories');
            console.log('Response status:', response.status);
            
            // レスポンスのステータスをチェック
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                console.log('サーバーからのカテゴリ取得に失敗しました。直接Twitch APIを試みます...');
                await fetchCategoriesDirectly();
                return;
            }
            
            // JSONデータを解析
            const data = await response.json();
            console.log('Categories received from API:', data.length, 'categories');
            
            // カテゴリ一覧を保存
            if (data && data.length > 0) {
                categories = data;
                // カテゴリ選択肢を更新
                updateCategoryOptions();
            } else {
                console.log('カテゴリデータが空です。直接Twitch APIを試みます...');
                await fetchCategoriesDirectly();
            }
            
        } catch (error) {
            console.error('Error fetching categories from server:', error);
            console.log('サーバーからのカテゴリ取得に失敗しました。直接Twitch APIを試みます...');
            await fetchCategoriesDirectly();
        }
    }
    
    // Twitch APIから直接カテゴリを取得する関数
    async function fetchCategoriesDirectly() {
        try {
            console.log('Directly fetching categories from Twitch API...');
            
            // 一般的な人気ゲームのIDとタイトルを手動で設定
            const popularCategories = [
                
                { id: "1286077738", name: "モンハンワイルズ" },
                { id: "509658", name: "Just Chatting" },
             //   { id: "33214", name: "Fortnite" },
                { id: "21779", name: "League of Legends" },
                { id: "516575", name: "VALORANT" },
            //    { id: "27471", name: "Minecraft" },
                { id: "32982", name: "Grand Theft Auto V" },
                { id: "511224", name: "Apex Legends" },
           //     { id: "509663", name: "Special Events" },
             //   { id: "26936", name: "Music" },
            //    { id: "18122", name: "World of Warcraft" },
           //     { id: "29595", name: "Dota 2" },
             //   { id: "512710", name: "Call of Duty: Warzone" },
           //     { id: "515025", name: "Overwatch 2" },
            //    { id: "263490", name: "Rust" },
           //     { id: "513143", name: "Teamfight Tactics" },
            //    { id: "491487", name: "Dead by Daylight" },
          //      { id: "511399", name: "FIFA 23" },
           //     { id: "2748", name: "Magic: The Gathering" },
            //    { id: "138585", name: "Hearthstone" }
            ];
            
            console.log('Using pre-defined popular categories:', popularCategories.length);
            
            // カテゴリ一覧を保存
            categories = popularCategories;
            
            // カテゴリ選択肢を更新
            updateCategoryOptions();
            
        } catch (error) {
            console.error('Error fetching categories directly:', error);
            showError('カテゴリ一覧の取得に失敗しました');
            
            // エラー時のフォールバック：カテゴリなしでデータを取得
            console.log('カテゴリなしでデータを取得します');
            fetchData();
        }
    }
    
    // カテゴリ選択肢を更新する関数
    function updateCategoryOptions() {
        // 既存のオプションをクリア（最初のオプションは残す）
        while (categorySelect.options.length > 1) {
            categorySelect.remove(1);
        }
        
        // カテゴリがない場合は終了
        if (!categories || categories.length === 0) {
            console.log('カテゴリがありません');
            return;
        }
        
        // カテゴリをソート（日本語名で）
        categories.sort((a, b) => a.name.localeCompare(b.name));
        
        // カテゴリをセレクトボックスに追加
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }
    
    // APIからデータを取得する関数
    async function fetchData() {
        try {
            // ローディング表示、エラーとテーブルを非表示
            if (loadingElement) loadingElement.style.display = 'block';
            if (errorElement) errorElement.style.display = 'none';
            if (rankingsTable) rankingsTable.style.display = 'none';
            
            console.log('Fetching data from API...');
            
            // Vercel環境用のAPIエンドポイント
            let apiUrl = '/api/streams';
            
            // カテゴリが選択されている場合
            if (currentCategoryId) {
                console.log('Using category filter:', currentCategoryId);
                // Vercel環境ではクエリパラメータを直接URLに追加
                apiUrl = `/api/streams?category_id=${encodeURIComponent(currentCategoryId)}`;
                console.log('API URL with category:', apiUrl);
            } else {
                console.log('No category filter selected');
            }
            
            console.log('Requesting API URL:', apiUrl);
            
            try {
                // APIからデータを取得
                const response = await fetch(apiUrl);
                
                // レスポンスのステータスをチェック
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API error response:', errorText);
                    throw new Error(`APIエラー: ${response.status} - ${errorText}`);
                }
                
                // JSONデータを解析
                const data = await response.json();
                console.log('Data received from API:', data.length, 'streams');
                
                // データが空の場合
                if (!data || data.length === 0) {
                    showError('表示するデータがありません。別のカテゴリを選択してください。');
                    if (loadingElement) loadingElement.style.display = 'none';
                    return;
                }
                
                // 全てのデータを保存
                allStreamData = data;
                
                // 現在のページのデータを表示
                renderCurrentPageData();
            } catch (error) {
                console.error('API request failed:', error);
                // Vercelデプロイ環境での失敗を考慮したフォールバック処理
                showError(`データの取得に失敗しました: ${error.message}`);
            }
            
        } catch (error) {
            console.error('Error in fetchData function:', error);
            showError(error.message);
        }
    }
    
    // フィルター変更時のイベントハンドラを設定
    function setupFilterHandlers() {
        // カテゴリ選択変更時
        categorySelect.addEventListener('change', () => {
            currentCategoryId = categorySelect.value;
            currentPage = 1; // ページを1に戻す
            updatePageButtons();
            fetchData(); // データを再取得
        });
    }
    
    // 初期化処理
    function init() {
        // ページネーションをセットアップ
        setupPagination();
        
        // フィルターハンドラをセットアップ
        setupFilterHandlers();
        
        // カテゴリ一覧を取得
        fetchCategories();
        
        // 初回データ取得
        fetchData();
        
        // 60秒ごとにデータを更新
        setInterval(fetchData, 60000);
    }
    
    // 初期化を実行
    init();
});
