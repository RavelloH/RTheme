import { RiArrowGoBackLine, RiLogoutBoxLine } from "@remixicon/react";

import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import ClientDiagnostics from "@/components/ui/ClientDiagnostics";
import LinkButton from "@/components/ui/LinkButton";

export default function ForbiddenPage({
  role,
  allowRoles,
}: {
  role: string;
  allowRoles?: string[];
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
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10]}
              className="px-10 py-15"
              width={14 / 9}
              height={1}
            >
              <div className="text-7xl font-bold mb-4" data-fade-char>
                ERROR...
              </div>
              <div className="text-6xl mb-4" data-fade-word>
                HTTP 403 Forbidden
              </div>
              <div className="text-2xl mb-8" data-fade-word>
                当前账号权限不足。
              </div>
              <div
                className="text-2xl text-muted-foreground mb-12"
                data-line-reveal
              >
                <div>当前角色：{role}，</div>
                <div>
                  {allowRoles && `允许访问的角色：${allowRoles.join("、")}。`}
                </div>
                <div>
                  <br />
                </div>
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
                href="/logout?redirect=/login"
                text="切换账号"
                icon={<RiLogoutBoxLine />}
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
                  <ClientDiagnostics errorType="HTTP/403" />
                </div>
              </div>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
