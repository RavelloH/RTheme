import { md5 } from "js-md5";
import { notFound } from "next/navigation";

import PhotoModalClient from "@/app/(build-in)/gallery/@modal/(.)photo/[slug]/PhotoModalClient";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import prisma from "@/lib/server/prisma";

interface PhotoModalProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const photos = await prisma.photo.findMany({
    select: { slug: true },
  });
  const params = photos.map((photo) => ({ slug: photo.slug }));
  return params.length > 0 ? params : [{ slug: "__neutralpress__" }];
}

// 过滤 EXIF 数据中的 GPS 信息
function filterGpsFromExif(exif: unknown): unknown {
  if (!exif || typeof exif !== "object") return exif;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exifData = exif as any;

  // 如果有 raw 数据，需要保留以便客户端解析，但解析后会过滤 GPS
  // 如果有已解析的 GPS 字段，直接删除
  const filtered = { ...exifData };

  // 删除常见的 GPS 相关字段
  const gpsFields = [
    "GPSInfo",
    "GPSLatitude",
    "GPSLongitude",
    "GPSLatitudeRef",
    "GPSLongitudeRef",
    "GPSAltitude",
    "GPSAltitudeRef",
    "GPSTimeStamp",
    "GPSDateStamp",
    "GPSSpeed",
    "GPSSpeedRef",
    "GPSImgDirection",
    "GPSImgDirectionRef",
    "GPSDestLatitude",
    "GPSDestLongitude",
    "GPSHPositioningError",
    "latitude",
    "longitude",
    "altitude",
    "gpsImgDirection",
    "gpsSpeed",
    "gpsSpeedRef",
    "gpsHPositioningError",
    "gpsDateTime",
  ];

  for (const field of gpsFields) {
    delete filtered[field];
  }

  return filtered;
}

export default async function PhotoModal({ params }: PhotoModalProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const photo = await prisma.photo.findUnique({
    where: { slug },
    include: {
      media: {
        include: {
          user: {
            select: {
              uid: true,
              username: true,
              nickname: true,
              avatar: true,
              bio: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!photo) {
    notFound();
  }

  // 计算用户邮箱的 MD5 值
  const emailMd5 = photo.media.user.email
    ? md5(photo.media.user.email.trim().toLowerCase())
    : null;

  // 如果 hideGPS 为 true，过滤 EXIF 中的 GPS 信息
  const processedMedia = {
    ...photo.media,
    exif: photo.hideGPS
      ? filterGpsFromExif(photo.media.exif)
      : photo.media.exif,
    user: {
      ...photo.media.user,
      email: undefined, // 不要把邮箱传到客户端
      emailMd5,
    },
  };

  const processedPhoto = {
    ...photo,
    media: processedMedia,
  };

  const signedId = generateSignedImageId(photo.media.shortHash);
  const imageUrl = `/p/${signedId}`;

  // 根据宽高比判断图片类型
  let imageType: "wide" | "tall" | "square";
  if (photo.media.width && photo.media.height) {
    const ratio = photo.media.width / photo.media.height;
    if (ratio >= 1.5) {
      imageType = "wide";
    } else if (ratio <= 0.66) {
      imageType = "tall";
    } else {
      imageType = "square";
    }
  } else {
    imageType = "square";
  }

  // 使用时间戳确保每次导航都重新挂载组件
  const mountKey = `photo-modal-${photo.id}-${Date.now()}`;

  return (
    <PhotoModalClient
      key={mountKey}
      photo={processedPhoto}
      imageUrl={imageUrl}
      imageType={imageType}
    />
  );
}
