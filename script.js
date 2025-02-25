// API呼び出し部分のみ抜粋
async function fetchData() {
    try {
        // ローディング表示、エラーとテーブルを非表示
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        rankingsTable.style.display = 'none';
        
        // PHPのAPIからデータを取得
        const response = await fetch('api.php');
        
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
    }
}