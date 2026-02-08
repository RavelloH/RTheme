import { readFile } from "fs/promises";
import { ImageResponse } from "next/og";
import { join } from "path";

interface IconMetadata {
  contentType: string;
  size: { width: number; height: number };
  id: string;
}

// 强制静态生成
export const dynamic = "force-static";

// 启用缓存
export const revalidate = false;

export function generateImageMetadata(): IconMetadata[] {
  return [
    {
      contentType: "image/png",
      size: { width: 16, height: 16 },
      id: "16x",
    },
    {
      contentType: "image/png",
      size: { width: 32, height: 32 },
      id: "32x",
    },
    {
      contentType: "image/png",
      size: { width: 36, height: 36 },
      id: "36x",
    },
    {
      contentType: "image/png",
      size: { width: 48, height: 48 },
      id: "48x",
    },
    {
      contentType: "image/png",
      size: { width: 72, height: 72 },
      id: "72x",
    },
    {
      contentType: "image/png",
      size: { width: 96, height: 96 },
      id: "96x",
    },
    {
      contentType: "image/png",
      size: { width: 128, height: 128 },
      id: "128x",
    },
    {
      contentType: "image/png",
      size: { width: 144, height: 144 },
      id: "144x",
    },
    {
      contentType: "image/png",
      size: { width: 192, height: 192 },
      id: "192x",
    },
    {
      contentType: "image/png",
      size: { width: 256, height: 256 },
      id: "256x",
    },
    {
      contentType: "image/png",
      size: { width: 384, height: 384 },
      id: "384x",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "512x",
    },
    {
      contentType: "image/png",
      size: { width: 1024, height: 1024 },
      id: "1024x",
    },
  ];
}

export default async function Icon({
  id,
}: {
  id: string | Promise<string>;
  params?: { __metadata_id__: string };
}) {
  const metadataId = await id;

  // 读取本地的 icon.png 文件
  const iconPath = join(process.cwd(), "public", "icon.png");
  const iconBuffer = await readFile(iconPath);
  const iconBase64 = `data:image/png;base64,${iconBuffer.toString("base64")}`;

  // 从 metadata 中查找匹配的尺寸
  const metadata = generateImageMetadata();
  const metadataItem = metadata.find((item) => item.id === metadataId);
  const size = metadataItem?.size.width || 192; // 默认 192

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={iconBase64} width={size} height={size} alt="Icon" />
    ),
    {
      width: size,
      height: size,
    },
  );
}
