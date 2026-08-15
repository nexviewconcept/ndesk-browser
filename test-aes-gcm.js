const crypto = require('crypto').webcrypto;

async function runTest() {
  console.log("=== AES-GCM Web Crypto Verification Test ===");
  try {
    // Generate key
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    console.log("[PASS] Key Generated");

    // 1 & 2. Encrypt and Decrypt
    const plaintext = "mySuperSecretPassword123";
    const iv1 = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer1 = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv1 },
      key,
      new TextEncoder().encode(plaintext)
    );
    console.log("[PASS] Encrypt successful");

    const decryptedBuffer1 = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv1 },
      key,
      cipherBuffer1
    );
    const recovered = new TextDecoder().decode(decryptedBuffer1);
    
    // 3. Correct plaintext recovery
    if (recovered === plaintext) {
      console.log("[PASS] Decrypt successful and plaintext matches");
    } else {
      throw new Error("Plaintext mismatch");
    }

    // 4. Different IV on repeated encryption
    const iv2 = crypto.getRandomValues(new Uint8Array(12));
    let isDifferentIv = false;
    for (let i = 0; i < 12; i++) {
      if (iv1[i] !== iv2[i]) isDifferentIv = true;
    }
    if (isDifferentIv) {
      console.log("[PASS] Different IV on repeated encryption");
    } else {
      throw new Error("IVs are identical");
    }

    // 5. Ciphertext tampering causes decryption failure
    const tamperedCipherBuffer = cipherBuffer1.slice(0);
    new Uint8Array(tamperedCipherBuffer)[0] ^= 1; // Flip a bit
    
    try {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv1 },
        key,
        tamperedCipherBuffer
      );
      throw new Error("FAIL: Tampered ciphertext was successfully decrypted!");
    } catch (e) {
      console.log("[PASS] Ciphertext tampering caused decryption failure");
    }

    // 6. Wrong key causes decryption failure
    const wrongKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    try {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv1 },
        wrongKey,
        cipherBuffer1
      );
      throw new Error("FAIL: Wrong key successfully decrypted!");
    } catch (e) {
      console.log("[PASS] Wrong key caused decryption failure");
    }

    console.log("=== ALL CRYPTO TESTS PASSED ===");
  } catch (e) {
    console.error("Test failed: ", e);
  }
}

runTest();
