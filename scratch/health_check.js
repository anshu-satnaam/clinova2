const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config({ path: '/Users/satnaamsinghgandhi/Desktop/Clinova/backend/gateway-service/.env' });

async function runCheck() {
  console.log('🔍 Starting Clinova System Health Check...\n');

  // 1. Database Check
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`✅ Database: Connected. User count: ${userCount}`);
  } catch (e) {
    console.error(`❌ Database: Connection FAILED. Error: ${e.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Gateway Connectivity
  try {
    const res = await axios.get('http://localhost:3000/api/docs').catch(() => null);
    if (res) console.log('✅ Gateway: Online (3000)');
    else console.log('❌ Gateway: Offline (3000)');
  } catch (e) {}

  // 3. AI Service Connectivity
  try {
    const res = await axios.get('http://localhost:8001/').catch(() => null);
    if (res) console.log('✅ AI Service: Online (8001)');
    else console.log('❌ AI Service: Offline (8001)');
  } catch (e) {}

  // 4. ChromaDB Check
  try {
    const res = await axios.get('http://localhost:8005/api/v1/heartbeat').catch(() => null);
    if (res) console.log('✅ ChromaDB: Online (8005)');
    else console.log('❌ ChromaDB: Offline (8005)');
  } catch (e) {}

  // 5. Mistral AI Check
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (!mistralKey || mistralKey === 'PASTE_YOUR_MISTRAL_API_KEY') {
    console.log('⚠️ Mistral AI: Key is missing or placeholder.');
  } else {
    try {
      const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-tiny',
        messages: [{ role: 'user', content: 'hi' }]
      }, {
        headers: { Authorization: `Bearer ${mistralKey}` }
      });
      if (res.data) console.log('✅ Mistral AI: API Key is VALID.');
    } catch (e) {
      console.log(`❌ Mistral AI: API Key check FAILED. ${e.response?.data?.message || e.message}`);
    }
  }

  console.log('\n🏁 Health Check Complete.');
}

runCheck();
