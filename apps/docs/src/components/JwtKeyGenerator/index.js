import React, { useState } from "react";
import styles from "./styles.module.css";

export default function JwtKeyGenerator() {
  const [keyPair, setKeyPair] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generateKeyPair = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 检查浏览器是否支持 Web Crypto API
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error("您的浏览器不支持 Web Crypto API，请使用现代浏览器");
      }

      // 使用 ES256 算法生成 P-256 椭圆曲线密钥对
      const cryptoKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256", // 等同于 prime256v1
        },
        true, // 可导出
        ["sign", "verify"],
      );

      // 导出私钥为 PKCS#8 格式
      const privateKeyBuffer = await window.crypto.subtle.exportKey(
        "pkcs8",
        cryptoKeyPair.privateKey,
      );

      // 导出公钥为 SPKI 格式
      const publicKeyBuffer = await window.crypto.subtle.exportKey(
        "spki",
        cryptoKeyPair.publicKey,
      );

      // 转换为 PEM 格式
      const privateKeyPem = bufferToPem(privateKeyBuffer, "PRIVATE KEY");
      const publicKeyPem = bufferToPem(publicKeyBuffer, "PUBLIC KEY");

      setKeyPair({
        privateKey: privateKeyPem,
        publicKey: publicKeyPem,
      });
    } catch (err) {
      setError(`生成密钥对失败: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const bufferToPem = (buffer, label) => {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const base64WithLineBreaks = base64.replace(/(.{64})/g, "$1\n");
    return `-----BEGIN ${label}-----\n${base64WithLineBreaks}\n-----END ${label}-----`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>在线 JWT 密钥对生成器</h3>
        <p className={styles.description}>
          使用 ES256 算法（P-256 椭圆曲线）生成 JWT
          密钥对。此操作完全在您的浏览器中本地完成，不会上传任何数据。
        </p>
      </div>

      <div className={styles.controls}>
        <button
          className={styles.generateButton}
          onClick={generateKeyPair}
          disabled={isGenerating}
        >
          {isGenerating ? "生成中..." : "生成新密钥对"}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {keyPair && (
        <div className={styles.results}>
          <div className={styles.keySection}>
            <h4>私钥 (Private Key)</h4>
            <p className={styles.warning}>
              <strong>重要</strong>：请妥善保管您的私钥，切勿泄露给他人
            </p>
            <div className={styles.keyContainer}>
              <pre className={styles.keyContent}>{keyPair.privateKey}</pre>
            </div>
          </div>

          <div className={styles.keySection}>
            <h4>公钥 (Public Key)</h4>
            <div className={styles.keyContainer}>
              <pre className={styles.keyContent}>{keyPair.publicKey}</pre>
            </div>
          </div>

          <div className={styles.envInstructions}>
            <h4>环境变量设置</h4>
            <p>将生成的密钥添加到您的环境变量中：</p>
            <div className={styles.envExample}>
              <pre>
                {`# .env 或 .env.local
JWT_PRIVATE_KEY="${keyPair.privateKey.replace(/\n/g, "\\n")}"
JWT_PUBLIC_KEY="${keyPair.publicKey.replace(/\n/g, "\\n")}"`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
