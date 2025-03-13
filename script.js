// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
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
    
    // URLからカテゴリIDを取得（変数初期化後に実行）
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('category_id');
    
    if (categoryIdFromUrl) {
        console.log('カテゴリIDがURLから検出されました:', categoryIdFromUrl);
        currentCategoryId = categoryIdFromUrl;
    }
    
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
                { id: "509658", name: "雑談" },
                { id: "21779", name: "League of Legends" },
                { id: "516575", name: "VALORANT" },
                { id: "263490", name: "Rust" },
                { id: "1286077738", name: "モンハンワイルズ" },
                { id: "27471", name: "Minecraft" },
                { id: "32982", name: "Grand Theft Auto V" },
                { id: "511224", name: "Apex Legends" },
               { id: "515025", name: "Overwatch 2" },
                { id: "491487", name: "Dead by Daylight" },
            ];
            
            console.log('Using pre-defined popular categories:', popularCategories.length);
            
            // カテゴリ一覧を保存
            categories = popularCategories;
            
            // カテゴリ選択肢を更新
            updateCategoryOptions();
            
            // URLからのカテゴリIDが設定されている場合、選択状態を更新
            if (currentCategoryId) {
                console.log('URLから取得したカテゴリIDを選択状態に設定:', currentCategoryId);
                categorySelect.value = currentCategoryId;
            }
            
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
        
        // カテゴリをセレクトボックスに追加
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            // URLから取得したカテゴリIDと一致する場合、選択状態にする
            if (category.id === currentCategoryId) {
                option.selected = true;
            }
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
    
// 初期化処理の中で、オリジナルのupdateCategoryOptions関数を保存
function init() {
    console.log('Initializing application...');

    // オリジナルのupdateCategoryOptions関数を保存
    const originalUpdateCategoryOptions = updateCategoryOptions;

    // カスタムセレクトボックスの設定
    const customSelect = document.getElementById('custom-category-select');
    const customSelectValue = customSelect.querySelector('.custom-select-value');
    const customSelectDropdown = document.querySelector('.custom-select-dropdown');

    // カスタムセレクトボックスのクリックイベント
    if (customSelect) {
        customSelect.addEventListener('click', function() {
            this.classList.toggle('open');
        });

        // ドキュメント全体のクリックイベントで外側をクリックしたらドロップダウンを閉じる
        document.addEventListener('click', function(event) {
            if (!customSelect.contains(event.target)) {
                customSelect.classList.remove('open');
            }
        });
    }

    // updateCategoryOptions関数を上書き
    updateCategoryOptions = function() {
        console.log('カスタムupdateCategoryOptions関数が呼ばれました');
        
        // 既存のオプションをクリア（最初のオプションは残す）
        while (categorySelect.options.length > 1) {
            categorySelect.remove(1);
        }
        
        // カスタムドロップダウンのオプションをクリア（最初のオプションは残す）
        const customDropdown = document.querySelector('.custom-select-dropdown');
        if (customDropdown) {
            // 最初のオプション以外を削除
            while (customDropdown.children.length > 1) {
                customDropdown.removeChild(customDropdown.lastChild);
            }
        }
        
        // カテゴリがない場合は終了
        if (!categories || categories.length === 0) {
            console.log('カテゴリがありません');
            return;
        }
        
        console.log('利用可能なカテゴリ:', categories.length);
        
        // カテゴリごとにアイコンを決定する関数
        function getCategoryIcon(categoryName) {
            // カテゴリ名によって異なるアイコンを返す
            if (categoryName.includes('雑談')) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
            } else if (categoryName.includes('Minecraft')) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>';
            } else if (categoryName.includes('Fortnite') || categoryName.includes('VALORANT') || categoryName.includes('Apex')) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 9-7-7-7 7"></path><path d="M19 15v4h-4"></path><path d="M5 15v4h4"></path><path d="m5 15 14-7"></path></svg>';
            } else {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M20 4v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4"></path><path d="M6 8h.01"></path><path d="M10 8h.01"></path><path d="M14 8h.01"></path><path d="M18 8h.01"></path></svg>';
            }
        }
        
        // カテゴリをセレクトボックスとカスタムドロップダウンに追加
        categories.forEach(category => {
            // 標準のセレクトボックス用オプション
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            // URLから取得したカテゴリIDと一致する場合、選択状態にする
            if (category.id === currentCategoryId) {
                option.selected = true;
                if (customSelectValue) {
                    customSelectValue.textContent = category.name;
                }
            }
            categorySelect.appendChild(option);
            
            // カスタムドロップダウン用オプション
            if (customDropdown) {
                const customOption = document.createElement('div');
                customOption.className = 'custom-select-option';
                customOption.dataset.value = category.id;
                if (category.id === currentCategoryId) {
                    customOption.classList.add('selected');
                }
                
                // アイコンと名前を設定
                customOption.innerHTML = `
                    <div class="custom-select-option-icon">
                        ${getCategoryIcon(category.name)}
                    </div>
                    <div>${category.name}</div>
                `;
                
                // クリックイベント
                customOption.addEventListener('click', function() {
                    // 値を標準のセレクトに設定して変更イベントを発火
                    categorySelect.value = this.dataset.value;
                    categorySelect.dispatchEvent(new Event('change'));
                    
                    // 表示テキストを更新
                    if (customSelectValue) {
                        customSelectValue.textContent = this.querySelector('div:last-child').textContent;
                    }
                    
                    // 選択状態のクラスを更新
                    document.querySelectorAll('.custom-select-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    
                    // ドロップダウンを閉じる
                    if (customSelect) {
                        customSelect.classList.remove('open');
                    }
                });
                
                customDropdown.appendChild(customOption);
            }
        });
        
        console.log('カテゴリオプションを更新しました');
    };

    // カテゴリ選択のイベントリスナーを設定
    categorySelect.addEventListener('change', (event) => {
        const selectedCategoryId = event.target.value;
        console.log('カテゴリが選択されました:', selectedCategoryId);
        
        // 別ページに遷移
        if (selectedCategoryId) {
            window.location.href = `?category_id=${selectedCategoryId}`;
        } else {
            // カテゴリが選択されていない場合はトップページに戻る
            window.location.href = './';
        }
    });
    
    // ページネーションの設定
    setupPagination();
    
    // カテゴリ一覧を取得
    fetchCategories()
        .then(() => {
            // カテゴリ一覧の取得後にデータを取得
            fetchData();
        })
        .catch(error => {
            console.error('初期化中にエラーが発生しました:', error);
            showError(error.message);
        });
        
    // 60秒ごとにデータを更新
    setInterval(fetchData, 60000);
}
    
    // 初期化を実行
    init();
});
