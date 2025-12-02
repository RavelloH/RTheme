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
  const [avatarUrls, setAvatarUrls] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const prepareUrls = async () => {
      setUseFallback(false);
      setActiveIndex(0);

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

      if (!cancelled) {
        setAvatarUrls(candidates);
        setUseFallback(!candidates.length);
      }
    };

    void prepareUrls();

    return () => {
      cancelled = true;
    };
  }, [avatarUrl, email, emailMd5]);

  useEffect(() => {
    setUseFallback(avatarUrls.length === 0);
  }, [avatarUrls]);

  const handleError = () => {
    setActiveIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex < avatarUrls.length) {
        return nextIndex;
      }
      setUseFallback(true);
      return prev;
    });
  };

  const activeUrl = !useFallback ? avatarUrls[activeIndex] : undefined;

  const displayName = useMemo(
    () => username || email || "avatar",
    [username, email],
  );
  const borderRadiusClass = shape === "circle" ? "rounded-full" : "";

  return (
    <div
      className={`inline-block overflow-hidden ${borderRadiusClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {activeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt={`${displayName} avatar`}
          width={size}
          height={size}
          onError={handleError}
          className={`h-full w-full object-cover ${borderRadiusClass}`}
        />
      ) : (
        <Avatar
          name={displayName}
          colors={colors}
          variant={variant}
          size={size}
          square={shape === "square"}
        />
      )}
    </div>
  );
}
