"use client";

import Avatar from "boring-avatars";
import { useEffect, useMemo, useState } from "react";
import { md5 } from "js-md5";

type AvatarShape = "circle" | "square";
type BoringAvatarVariant =
  | "pixel"
  | "bauhaus"
  | "ring"
  | "beam"
  | "sunset"
  | "marble"
  | "geometric"
  | "abstract";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  email?: string | null;
  emailMd5?: string | null;
  size?: number;
  shape?: AvatarShape;
  className?: string;
  colors?: string[];
  variant?: BoringAvatarVariant;
}

const md5Hex = (text: string) => md5(text);

export default function UserAvatar({
  username,
  avatarUrl,
  email,
  emailMd5,
  size = 32,
  shape = "circle",
  className = "",
  colors,
  variant = "marble",
}: UserAvatarProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const prepareAndLoadUrls = async () => {
      // 重置状态
      setLoadedUrl(null);

      const candidates: string[] = [];
      if (avatarUrl) {
        candidates.push(avatarUrl);
      }

      // 优先使用服务器端计算的 MD5
      if (emailMd5) {
        candidates.push(
          `https://cravatar.cn/avatar/${emailMd5}?d=404`,
          `https://gravatar.cn/avatar/${emailMd5}?d=404`,
        );
      }

      // 如果没有服务器端 MD5，则在客户端计算
      const normalizedEmail = email?.trim().toLowerCase();
      if (normalizedEmail && !emailMd5) {
        try {
          const hash = md5Hex(normalizedEmail);
          if (cancelled) return;
          candidates.push(
            `https://cravatar.cn/avatar/${hash}?d=404`,
            `https://gravatar.cn/avatar/${hash}?d=404`,
          );
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error(error);
          }
        }
      }

      // 逐个尝试加载图片
      for (const url of candidates) {
        if (cancelled) break;

        try {
          // 使用 Image 对象预加载
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
          });

          // 加载成功，更新状态
          if (!cancelled) {
            setLoadedUrl(url);
            break;
          }
        } catch {
          // 加载失败，继续尝试下一个
          continue;
        }
      }
    };

    void prepareAndLoadUrls();

    return () => {
      cancelled = true;
    };
  }, [avatarUrl, email, emailMd5]);

  const displayName = useMemo(
    () => username || email || "avatar",
    [username, email],
  );
  const borderRadiusClass = shape === "circle" ? "rounded-full" : "";

  // 检查 className 是否包含响应式尺寸类，如果是则不使用固定尺寸
  const hasResponsiveSize =
    className.includes("w-full") || className.includes("h-full");
  const actualSize = hasResponsiveSize ? undefined : size || 32;

  return (
    <div
      className={`inline-block overflow-hidden ${borderRadiusClass} ${className}`}
      style={actualSize ? { width: actualSize, height: actualSize } : undefined}
    >
      {loadedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={loadedUrl}
          alt={`${displayName} avatar`}
          width={actualSize}
          height={actualSize}
          className={`h-full w-full object-cover ${borderRadiusClass}`}
        />
      ) : hasResponsiveSize ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full">
            <Avatar
              name={displayName}
              colors={colors}
              variant={variant}
              size={80}
              square={shape === "square"}
            />
          </div>
        </div>
      ) : (
        <Avatar
          name={displayName}
          colors={colors}
          variant={variant}
          size={actualSize || 80}
          square={shape === "square"}
        />
      )}
    </div>
  );
}
