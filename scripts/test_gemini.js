const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }).generateContent('Hi').then(r => console.log(r.response.text()));
}
