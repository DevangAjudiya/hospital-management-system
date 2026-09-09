const crypto = require("crypto");

/**
 * AES-256-GCM Encryption Service
 * Provides secure encryption/decryption with versioning and authentication tags.
 * Acts as a KeyProvider abstraction for local development via environment variables,
 * which can be swapped for Vault/KMS in production.
 */
class EncryptionService {
    constructor() {
        this.ALGORITHM = 'aes-256-gcm';
        this.VERSION = 'v1';
        this.key = null;
        this.initKeyProvider();
    }

    initKeyProvider() {
        // EnvironmentKeyProvider abstraction:
        // In production, this logic would interface with Vault or KMS.
        // Provide a clear error if missing.
        const keyBase64 = process.env.MASTER_ENCRYPTION_KEY;
        if (keyBase64) {
            try {
                const buffer = Buffer.from(keyBase64, 'base64');
                if (buffer.length === 32) {
                    this.key = buffer;
                } else {
                    console.error("[EncryptionService] Invalid MASTER_ENCRYPTION_KEY length. Must be 32 bytes.");
                }
            } catch (e) {
                console.error("[EncryptionService] Failed to parse MASTER_ENCRYPTION_KEY as base64.");
            }
        }
    }

    encrypt(plaintext) {
        if (!plaintext) return plaintext;
        if (!this.key) {
            throw new Error("Encryption failed: Missing or invalid MASTER_ENCRYPTION_KEY (must be exactly 32 bytes base64)");
        }

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        const authTag = cipher.getAuthTag().toString('base64');
        const ivBase64 = iv.toString('base64');

        // Format: version:iv:authTag:ciphertext
        return `${this.VERSION}:${ivBase64}:${authTag}:${encrypted}`;
    }

    decrypt(ciphertext) {
        if (!ciphertext) return ciphertext;
        
        // Return legacy plaintext safely if it's not our versioned format
        if (!ciphertext.startsWith(`${this.VERSION}:`)) {
            // Note: If we add v2, we would handle it here. 
            // For now, anything not starting with v1: is assumed plaintext.
            return ciphertext; 
        }

        if (!this.key) {
             throw new Error("Decryption failed: Missing or invalid MASTER_ENCRYPTION_KEY");
        }

        const parts = ciphertext.split(':');
        if (parts.length !== 4) {
            throw new Error("Decryption failed: Invalid ciphertext format");
        }

        const [, ivBase64, authTagBase64, encryptedBase64] = parts;

        try {
            const iv = Buffer.from(ivBase64, 'base64');
            const authTag = Buffer.from(authTagBase64, 'base64');
            
            const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (err) {
            // Fails securely on tampered ciphertext or tag
            throw new Error("Decryption failed: Authentication tag verification failed or corrupted data");
        }
    }

    /**
     * Generates a deterministic HMAC-SHA256 hash of a plaintext string.
     * Used for secure, exact-match database lookups without exposing plaintext.
     * @param {string} plaintext 
     * @returns {string} Hex-encoded HMAC
     */
    hash(plaintext) {
        if (!plaintext) return plaintext;
        if (!this.key) {
             throw new Error("Hashing failed: Missing or invalid MASTER_ENCRYPTION_KEY");
        }

        // Normalize: trim whitespace and lowercase to ensure consistent hashing
        const normalized = plaintext.trim().toLowerCase();

        const hmac = crypto.createHmac('sha256', this.key);
        hmac.update(normalized, 'utf8');
        return hmac.digest('hex');
    }
}

module.exports = new EncryptionService();
