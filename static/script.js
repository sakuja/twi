async function fetchData() {
  console.log('Fetching data from API...');
  try {
    const response = await fetch('/api/streams');
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error('Failed to parse JSON response');
    }

    if (!Array.isArray(data)) {
      throw new Error('API response is not an array');
    }

    console.log('Data received from API');

    if (data.length > 0) {
      console.log('First stream data:', {
        user_name: data[0].user_name,
        started_at: data[0].started_at,
        stream_duration: data[0].stream_duration
      });

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
