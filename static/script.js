async function fetchData() {
  console.log('Fetching data from API...');
  try {
    const response = await fetch('/api/streams');
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Unexpected API response format: Expected an array');
    }

    console.log(`Data received from API: ${data.length} streams found`);

    if (data.length > 0) {
      console.log('First stream data:', {
        user_name: data[0].user_name,
        started_at: data[0].started_at,
        stream_duration: data[0].stream_duration
      });

      // `started_at` フィールドが欠けているストリーム数をカウント
      const missingStartedAt = data.filter(stream => !stream.started_at).length;
      console.log(`Streams missing started_at: ${missingStartedAt} out of ${data.length}`);
    } else {
      console.log('No stream data received');
    }

    return data;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return [];
  }
}
