const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAPI() {
  try {
    // Test server connection
    console.log('Testing server connection...');
    const testResponse = await axios.get('http://localhost:5000/api/test');
    console.log('Server response:', testResponse.data);

    // Test registration
    console.log('\nTesting registration...');
    const registerData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
      location: 'New York'
    };
    
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, registerData);
      console.log('Registration successful:', registerResponse.data);
    } catch (error) {
      console.log('Registration error:', error.response?.data || error.message);
    }

    // Test login
    console.log('\nTesting login...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, loginData);
      console.log('Login successful:', loginResponse.data);
    } catch (error) {
      console.log('Login error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

// First install axios: npm install axios
// Then run: node test-api.js
testAPI();