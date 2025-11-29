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

      const normalizedEmail = email?.trim().toLowerCase();
      if (normalizedEmail) {
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
  }, [avatarUrl, email]);

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
