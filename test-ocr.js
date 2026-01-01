/**
 * Test OCR endpoint by uploading a sample image
 * Requires backend running on http://localhost:5000
 */

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testOCR() {
  try {
    console.log('🧪 Testing OCR endpoint...\n');

    // Create a sample image (small PNG for testing)
    // Using a minimal valid PNG that says "Test"
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x8F, 0x8B, 0xAB,
      0x40, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    formData.append('file', pngBuffer, 'test.png');
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');

    const response = await axios.post(
      'http://localhost:5000/api/ocr/image-to-text',
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    console.log('✅ OCR Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🎉 OCR extraction is working!');

  } catch (error) {
    console.error('❌ OCR Test Failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testOCR();
