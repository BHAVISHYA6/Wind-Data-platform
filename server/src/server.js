require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');

const PORT = process.env.PORT || 5000;
const uploadDir = path.join(process.cwd(), 'upload');

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const startServer = async () => {
  ensureUploadDir();
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}\n`);
    console.log('📊 Analytics API Endpoints:');
    console.log(`   • http://localhost:${PORT}/api/analytics/summary`);
    console.log(`   • http://localhost:${PORT}/api/analytics/timeseries`);
    console.log(`   • http://localhost:${PORT}/api/analytics/errorlogs\n`);
  });
};

startServer().catch((error) => {
  console.error('Server failed to start:', error.message);
  process.exit(1);
});
