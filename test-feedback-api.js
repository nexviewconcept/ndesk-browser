// test-feedback-api.js
// Tests the robust Feedback API parsing logic for HTML responses

async function parseFeedbackResponse(mockResponseText, status) {
  if (mockResponseText.trim().startsWith('<')) {
    if (status >= 400) {
      throw new Error(`Server returned HTML error page (Status: ${status}). Expected JSON.`);
    } else {
      // It's technically 200 OK but HTML (common for Google Apps Script redirects)
      return { success: true, message: 'Received HTML redirect/success response.' };
    }
  }

  try {
    return JSON.parse(mockResponseText);
  } catch (e) {
    throw new Error('JSON Parse Error: ' + e.message);
  }
}

async function runTest() {
  console.log("=== Feedback API Robust Parsing Test ===");
  
  let passed = true;

  // Test 1: Valid JSON
  try {
    const res = await parseFeedbackResponse('{"success": true}', 200);
    if (!res.success) throw new Error("JSON parse failed");
    console.log("[PASS] Valid JSON parsed");
  } catch (e) {
    console.error("[FAIL] Valid JSON test: ", e);
    passed = false;
  }

  // Test 2: HTML Error page (e.g. 500 or 400 from Google Apps Script)
  try {
    await parseFeedbackResponse('<!DOCTYPE html><html><body>Error</body></html>', 500);
    console.error("[FAIL] HTML Error did not throw correctly");
    passed = false;
  } catch (e) {
    if (e.message.includes('Server returned HTML error page')) {
      console.log("[PASS] HTML Error correctly trapped without JSON crash");
    } else {
      console.error("[FAIL] HTML Error test threw wrong error: ", e);
      passed = false;
    }
  }

  // Test 3: HTML Success redirect (Google Apps Script quirks)
  try {
    const res = await parseFeedbackResponse('<html>Success redirect</html>', 200);
    if (res.success) {
      console.log("[PASS] HTML Success correctly handled");
    } else {
      throw new Error("HTML success failed");
    }
  } catch (e) {
    console.error("[FAIL] HTML Success test: ", e);
    passed = false;
  }

  if (passed) {
    console.log("=== ALL FEEDBACK TESTS PASSED ===");
  } else {
    console.error("=== FEEDBACK TESTS FAILED ===");
  }
}

runTest();
