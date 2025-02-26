import crypto from 'crypto';

const algorithm = 'aes-128-cbc';
const key = process.env.MESSAGE_KEY || 'default-key-12345'; // 16字节密钥
const iv = crypto.randomBytes(16);

export function encrypt(text) {
    try {
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted; // IV和加密内容一起存储
    } catch (error) {
        console.error('加密失败:', error);
        return text;
    }
}

export function decrypt(text) {
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return text;

        const ivHex = textParts[0];
        const encryptedText = textParts[1];
        const ivBuffer = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), ivBuffer);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('解密失败:', error);
        return text;
    }
}
