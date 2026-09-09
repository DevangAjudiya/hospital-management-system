const assert = require("assert");
const crypto = require("crypto");

// 1. Inject a valid 256-bit test key into the environment
process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

// Now require the service so it picks up the key
const encryptionService = require("../services/crypto/encryptionService");

function runEncryptionTests() {
    console.log("Running Encryption Service Tests...\n");
    let passed = 0;
    let failed = 0;

    // Test 1 & 2: Encrypt/decrypt round trip & AES-256-GCM format
    try {
        const plaintext = "Patient has severe headaches and hypertension.";
        const ciphertext = encryptionService.encrypt(plaintext);
        
        assert.ok(ciphertext.startsWith("v1:"));
        const parts = ciphertext.split(':');
        assert.strictEqual(parts.length, 4); // version, iv, tag, cipher
        
        const decrypted = encryptionService.decrypt(ciphertext);
        assert.strictEqual(decrypted, plaintext);
        console.log("✅ Test 1/2: Encrypt/decrypt round trip and format verified");
        passed++;
    } catch(e) { console.error("❌ Test 1/2 failed", e); failed++; }

    // Test 3: Every encryption gets a different IV/ciphertext for the same plaintext
    try {
        const plaintext = "Identical text";
        const c1 = encryptionService.encrypt(plaintext);
        const c2 = encryptionService.encrypt(plaintext);
        
        assert.notStrictEqual(c1, c2, "Ciphertexts should not match");
        const iv1 = c1.split(':')[1];
        const iv2 = c2.split(':')[1];
        assert.notStrictEqual(iv1, iv2, "IVs should be completely random and unique");
        console.log("✅ Test 3: Random IV generates unique ciphertexts (Non-deterministic)");
        passed++;
    } catch(e) { console.error("❌ Test 3 failed", e); failed++; }

    // Test 4 & 5: Tampered ciphertext and auth tag fail securely
    try {
        const c = encryptionService.encrypt("Secret Notes");
        let parts = c.split(':');
        
        // Tamper Ciphertext
        parts[3] = Buffer.from("fake data").toString('base64');
        assert.throws(() => encryptionService.decrypt(parts.join(':')), /Decryption failed/);
        
        // Tamper Auth Tag
        let parts2 = c.split(':');
        parts2[2] = crypto.randomBytes(16).toString('base64');
        assert.throws(() => encryptionService.decrypt(parts2.join(':')), /Decryption failed/);
        
        console.log("✅ Test 4/5: Tampered ciphertext and auth tag fail authentication safely");
        passed++;
    } catch(e) { console.error("❌ Test 4/5 failed", e); failed++; }

    // Test 6: Invalid ciphertext format fails safely
    try {
        assert.throws(() => encryptionService.decrypt("v1:tooshort"), /Invalid ciphertext format/);
        console.log("✅ Test 6: Invalid ciphertext format fails safely");
        passed++;
    } catch(e) { console.error("❌ Test 6 failed", e); failed++; }

    // Test 7 & 10: Plaintext/legacy compatibility behavior
    try {
        const legacyText = "This is an old plaintext record that was created before D7.";
        const decrypted = encryptionService.decrypt(legacyText);
        
        assert.strictEqual(decrypted, legacyText);
        console.log("✅ Test 7/10: Legacy plaintext falls back safely without crashing");
        passed++;
    } catch(e) { console.error("❌ Test 7/10 failed", e); failed++; }

    // Test 8 & 9: Missing/invalid encryption key fails safely
    try {
        // Backup the key and invalidate it
        const backupKey = encryptionService.key;
        encryptionService.key = null; 
        
        assert.throws(() => encryptionService.encrypt("test"), /Missing or invalid MASTER_ENCRYPTION_KEY/);
        
        // Create fake valid-looking ciphertext to test decryption without key
        const fakeCipher = "v1:a:b:c";
        assert.throws(() => encryptionService.decrypt(fakeCipher), /Missing or invalid MASTER_ENCRYPTION_KEY/);
        
        encryptionService.key = backupKey; // restore
        console.log("✅ Test 8/9: Missing/invalid encryption key fails safely and cleanly");
        passed++;
    } catch(e) { console.error("❌ Test 8/9 failed", e); failed++; }

    // Test 11: hash() is deterministic, handles case/whitespace, requires key
    try {
        const plaintext1 = "Patient@ABDM";
        const plaintext2 = " patient@abdm ";
        const plaintext3 = "other@abdm";

        const hash1 = encryptionService.hash(plaintext1);
        const hash2 = encryptionService.hash(plaintext2);
        const hash3 = encryptionService.hash(plaintext3);

        assert.ok(typeof hash1 === 'string' && hash1.length > 0);
        assert.strictEqual(hash1, hash2, "Whitespace and case should be normalized");
        assert.notStrictEqual(hash1, hash3, "Different plaintext should yield different hash");

        // Missing key fails safely
        const backupKey = encryptionService.key;
        encryptionService.key = null;
        assert.throws(() => encryptionService.hash("test"), /Missing or invalid MASTER_ENCRYPTION_KEY/);
        encryptionService.key = backupKey;

        console.log("✅ Test 11: hash() is deterministic, normalizes inputs, and requires key safely");
        passed++;
    } catch(e) { console.error("❌ Test 11 failed", e); failed++; }

    console.log(`\nEncryption Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runEncryptionTests();
