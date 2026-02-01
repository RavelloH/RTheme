import { Suspense } from "react";
import { RiArrowGoBackLine, RiFeedbackLine } from "@remixicon/react";

import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import ClientDiagnostics from "@/components/ui/ClientDiagnostics";
import LinkButton from "@/components/ui/LinkButton";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata({
  title: "404 Not Found",
  description:
    "在服务器中未找到此页面。这可能代表此页面已被删除、移动，或从未存在过。",
});

export default function NotFoundPage() {
  return (
    <>
      <MainLayout type="horizontal">
        <HorizontalScroll
          className="h-full"
          enableParallax={true}
          enableFadeElements={true}
          enableLineReveal={true}
          snapToElements={false}
        >
          <RowGrid>
            <GridItem
              areas={[1]}
              className="flex items-center px-10 bg-primary text-primary-foreground uppercase text-2xl"
              width={14}
              height={0.1}
            >
              <div className="text-2xl" data-fade-char>
                FATAL ERROR // 致命错误
              </div>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10]}
              className="px-10 py-15"
              width={14 / 9}
              height={1}
            >
              <div className="text-7xl font-bold mb-4" data-fade-char>
                ERROR...
              </div>
              <div className="text-6xl mb-4" data-fade-word>
                HTTP 404 Not Found
              </div>
              <div className="text-2xl mb-8" data-fade-word>
                请求的文件未在服务器中找到。
              </div>
              <div
                className="text-2xl text-muted-foreground mb-12"
                data-line-reveal
              >
                <div>您访问的页面可能已被删除、移动，</div>
                <div>或者从未存在过。</div>
                <div>
                  <br />
                </div>
                <div>请尝试：</div>
                <div>1. 检查当前链接是否正确</div>
                <div>2. 重新搜索相关内容</div>
                <div>3. 如果错误重复出现，请汇报给站点管理员。</div>
              </div>
            </GridItem>
            <GridItem
              areas={[11]}
              className="uppercase text-2xl"
              width={14}
              height={0.1}
            >
              <LinkButton
                mode="back"
                text="返回上一页"
                icon={<RiArrowGoBackLine />}
              />
            </GridItem>
            <GridItem
              areas={[12]}
              className="flex items-center uppercase text-2xl"
              width={14}
              height={0.1}
            >
              <LinkButton
                mode="link"
                href="/messages?uid=1"
                text="反馈给管理员"
                icon={<RiFeedbackLine />}
              />
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              className="px-10 flex items-center text-foreground"
              width={2}
              height={1.5}
            >
              <Suspense>
                <ClientDiagnostics errorType="HTTP/404" />
              </Suspense>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
