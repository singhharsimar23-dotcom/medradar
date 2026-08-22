const apiKey = 'PavVnNRqkZYCxoE49Ah5SsuW8prlFLz1wQDgObe6MjUBG7idtTbwPsG6vD08qFHEmekIOcnY32u5Adi4';

async function testFast2SMS() {
  const params = new URLSearchParams({
    authorization: apiKey,
    message: 'MedRadar: Test Alert from Bhopal Corridor',
    language: 'english',
    route: 'v3',
    speed: '1',
    numbers: '9876543210'
  });

  const url = `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`;
  console.log('Testing Fast2SMS URL...');
  const res = await fetch(url);
  const data = await res.json();
  console.log('Fast2SMS Response:', data);
}

testFast2SMS();
