// Simple test to verify the server works
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('POS System Test - Server is working!');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

module.exports = app;