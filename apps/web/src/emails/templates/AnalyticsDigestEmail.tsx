import * as React from "react";
import { Section, Text } from "@react-email/components";

import {
  EmailAlert,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails/components";

export interface AnalyticsDigestTrend {
  symbol: "▲" | "▼" | "■";
  text: string;
  color: "up" | "down" | "flat";
}

export interface AnalyticsDigestTopItem {
  name: string;
  count: number;
}

export interface AnalyticsDigestEmailProps {
  username: string;
  title: string;
  periodLabel: string;
  timezone: string;
  generatedAtLabel: string;
  totalViews: number;
  uniqueVisitors: number;
  totalViewsTrend: AnalyticsDigestTrend;
  uniqueVisitorsTrend: AnalyticsDigestTrend;
  flushSummaryLines: string[];
  topPaths: AnalyticsDigestTopItem[];
  topReferers: AnalyticsDigestTopItem[];
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
}

function getTrendClass(color: AnalyticsDigestTrend["color"]): string {
  if (color === "up") return "text-green-600";
  if (color === "down") return "text-red-600";
  return "text-gray-500";
}

function renderTopList(items: AnalyticsDigestTopItem[], emptyText: string) {
  if (items.length === 0) {
    return <Text className="text-sm text-gray-500 m-0">{emptyText}</Text>;
  }

  return (
    <Section>
      {items.map((item, index) => (
        <Text key={`${item.name}-${index}`} className="text-sm m-0 mb-2">
          {index + 1}. {item.name} ({item.count})
        </Text>
      ))}
    </Section>
  );
}

function renderSummaryLines(lines: string[]) {
  if (lines.length === 0) {
    return <Text className="text-sm text-gray-500 m-0">暂无执行明细</Text>;
  }

  return (
    <Section>
      {lines.map((line, index) => (
        <Text key={`${line}-${index}`} className="text-sm m-0 mb-2">
          - {line}
        </Text>
      ))}
    </Section>
  );
}

export function AnalyticsDigestEmail({
  username,
  title,
  periodLabel,
  timezone,
  generatedAtLabel,
  totalViews,
  uniqueVisitors,
  totalViewsTrend,
  uniqueVisitorsTrend,
  flushSummaryLines,
  topPaths,
  topReferers,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: AnalyticsDigestEmailProps) {
  return (
    <EmailLayout
      preview={title}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={2} align="left">
        {title}
      </EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>
      <EmailParagraph>访问统计整理已完成，以下是本次报告摘要。</EmailParagraph>

      <EmailAlert variant="info">
        统计区间：{periodLabel}
        <br />
        统计时区：{timezone}
      </EmailAlert>

      <Section className="rounded border border-gray-200 p-4 mb-6">
        <Text className="text-sm text-gray-500 m-0 mb-2">总浏览量</Text>
        <Text className="text-3xl font-bold m-0 mb-1">{totalViews}</Text>
        <Text
          className={`text-sm font-semibold m-0 ${getTrendClass(totalViewsTrend.color)}`}
        >
          {totalViewsTrend.symbol} {totalViewsTrend.text}
        </Text>
      </Section>

      <Section className="rounded border border-gray-200 p-4 mb-6">
        <Text className="text-sm text-gray-500 m-0 mb-2">独立访客</Text>
        <Text className="text-3xl font-bold m-0 mb-1">{uniqueVisitors}</Text>
        <Text
          className={`text-sm font-semibold m-0 ${getTrendClass(uniqueVisitorsTrend.color)}`}
        >
          {uniqueVisitorsTrend.symbol} {uniqueVisitorsTrend.text}
        </Text>
      </Section>

      <Section className="rounded border border-gray-200 p-4 mb-6">
        <Text className="text-sm font-semibold m-0 mb-3">
          热门页面（Top 5）
        </Text>
        {renderTopList(topPaths, "暂无页面访问数据")}
      </Section>

      <Section className="rounded border border-gray-200 p-4 mb-6">
        <Text className="text-sm font-semibold m-0 mb-3">
          来源统计（Top 5）
        </Text>
        {renderTopList(topReferers, "暂无来源数据")}
      </Section>

      <Section className="rounded border border-gray-200 p-4 mb-6">
        <Text className="text-sm font-semibold m-0 mb-3">整理执行结果</Text>
        {renderSummaryLines(flushSummaryLines)}
      </Section>

      <EmailParagraph variant="muted">
        生成时间：{generatedAtLabel}
        <br />
        你可以在 {siteName} 管理面板查看完整访问统计详情。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default AnalyticsDigestEmail;
