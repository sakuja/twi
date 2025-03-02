const fetchStreams = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/streams');

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response format');
    }

    setStreams(data);
  } catch (error) {
    console.error('Error fetching streams:', error);
    setError('ストリーム情報の取得に失敗しました。');
  } finally {
    setLoading(false);
  }
};
