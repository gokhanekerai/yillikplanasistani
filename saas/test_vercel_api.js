async function run() {
  try {
    const res = await fetch('https://yillikplanasistani.vercel.app/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rawText: 'test' })
    });
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    const text = await res.text();
    console.log('Body snippet:', text.substring(0, 1000));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
