"use client";

import {
  RiArrowGoBackLine,
  RiFeedbackLine,
  RiResetRightFill,
} from "@remixicon/react";

import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import ClientDiagnostics from "@/components/ui/ClientDiagnostics";
import LinkButton from "@/components/ui/LinkButton";
import { AutoTransition } from "@/ui/AutoTransition";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
              areas={[2, 3, 4, 5, 6, 7, 8, 9]}
              className="px-10 py-15"
              width={14 / 8}
              height={1}
            >
              <div className="text-7xl font-bold mb-4" data-fade-char>
                ERROR...
              </div>
              <div className="text-6xl mb-4" data-fade-char>
                Client DOM Error
              </div>
              <div className="text-2xl mb-8" data-fade-word>
                发生了一个严重客户端错误。页面DOM树已无法正确渲染。
              </div>
              <div
                className="text-2xl text-muted-foreground mb-12"
                data-line-reveal
              >
                <div>请尝试刷新或重置此页面以重试。</div>
                <div>如果问题重复出现，请复制诊断信息，并反馈给管理员。</div>
              </div>
            </GridItem>
            <GridItem
              areas={[10]}
              className="uppercase text-2xl"
              width={14}
              height={0.1}
            >
              <LinkButton
                mode="onClick"
                onClick={() => {
                  reset();
                }}
                icon={<RiResetRightFill />}
                text="尝试重置此页面"
              />
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
              className="text-foreground"
              width={2}
              height={1.5}
            >
              <div className="h-full overflow-y-auto overflow-x-hidden p-10">
                <div className="flex min-h-full items-center">
                  <AutoTransition duration={0.5} type="fade">
                    <ClientDiagnostics
                      errorType={error.name + "-" + error.digest}
                      errorStack={error.stack}
                      errorMessage={error.message}
                    />
                  </AutoTransition>
                </div>
              </div>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
