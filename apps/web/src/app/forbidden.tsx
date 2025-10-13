import BackLink from "@/components/BackLink";
import ClientDiagnostics from "@/components/ClientDiagnostics";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";

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
                <div>当前权限：{role}，</div>
                <div>
                  {allowRoles && `允许访问的权限：${allowRoles.join("、")}。`}
                </div>
                <div>
                  <br />
                </div>
              </div>
            </GridItem>
            <GridItem
              areas={[11]}
              className="flex items-center px-10 uppercase text-2xl"
              width={14}
              height={0.1}
            >
              <BackLink>
                <div className="text-2xl" data-fade-char>
                  回到上一页
                </div>
              </BackLink>
            </GridItem>
            <GridItem
              areas={[12]}
              className="flex items-center px-10 uppercase text-2xl"
              width={14}
              height={0.1}
            >
              <div className="text-2xl" data-fade-char>
                切换账号
              </div>
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              className="px-10 py-20 text-foreground"
              width={2}
              height={1.5}
            >
              <ClientDiagnostics errorType="HTTP/403" />
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
