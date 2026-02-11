import { md5 } from "js-md5";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import PhotoDetailClient from "@/app/(build-in)/gallery/photo/[slug]/PhotoDetailClient";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import prisma from "@/lib/server/prisma";
import { generateMetadata as generateSeoMetadata } from "@/lib/server/seo";

interface PhotoPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const photos = await prisma.photo.findMany({
    select: { slug: true },
  });
  const params = photos.map((photo) => ({ slug: photo.slug }));
  return params.length > 0 ? params : [{ slug: "__neutralpress__" }];
}

export async function generateMetadata({
  params,
}: PhotoPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    return generateSeoMetadata({ title: "照片不存在" });
  }

  const photo = await prisma.photo.findUnique({
    where: { slug },
    include: {
      media: {
        include: {
          user: {
            select: {
              nickname: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!photo) {
    return generateSeoMetadata({ title: "照片不存在" });
  }

  return generateSeoMetadata(
    {
      title: photo.name || "无标题照片",
      description:
        photo.description ||
        photo.media.altText ||
        `由 ${photo.media.user.nickname || photo.media.user.username} 拍摄`,
    },
    {
      pathname: `/gallery/photo/${photo.slug}`,
    },
  );
}

// 过滤 EXIF 数据中的 GPS 信息
function filterGpsFromExif(exif: unknown): unknown {
  if (!exif || typeof exif !== "object") return exif;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exifData = exif as any;

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

export default async function PhotoPage({ params }: PhotoPageProps) {
  "use cache";
  const { slug } = await params;
  cacheTag(`photos/${slug}`);
  cacheLife("max");

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

  return (
    <MainLayout type="horizontal">
      <HorizontalScroll className="h-full">
        <PhotoDetailClient photo={processedPhoto} imageUrl={imageUrl} />
      </HorizontalScroll>
    </MainLayout>
  );
}
