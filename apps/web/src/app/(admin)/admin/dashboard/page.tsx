import { getCommentStats } from "@/actions/comment";
import { doctor } from "@/actions/doctor";
import { getFriendLinksStats } from "@/actions/friendlink";
import { getMediaStats } from "@/actions/media";
import { getSearchIndexStats, getSearchLogStats } from "@/actions/search";
import { getSecurityOverview } from "@/actions/security";
import {
  getAuditStats,
  getCategoriesStats,
  getPagesStats,
  getPostsStats,
  getProjectsStats,
  getTagsStats,
  getUsersStats,
  getVisitStats,
} from "@/actions/stat";
import DashboardAuditStats from "@/app/(admin)/admin/dashboard/DashboardAuditStats";
import DashboardCategoriesStats from "@/app/(admin)/admin/dashboard/DashboardCategoriesStats";
import DashboardCommentsStats from "@/app/(admin)/admin/dashboard/DashboardCommentsStats";
import DashboardDoctor from "@/app/(admin)/admin/dashboard/DashboardDoctor";
import DashboardFriendsStats from "@/app/(admin)/admin/dashboard/DashboardFriendsStats";
import DashboardMediaStats from "@/app/(admin)/admin/dashboard/DashboardMediaStats";
import DashboardPagesStats from "@/app/(admin)/admin/dashboard/DashboardPagesStats";
import DashboardPostsStats from "@/app/(admin)/admin/dashboard/DashboardPostsStats";
import DashboardProjectsStats from "@/app/(admin)/admin/dashboard/DashboardProjectsStats";
import DashboardSearchIndexStats from "@/app/(admin)/admin/dashboard/DashboardSearchIndexStats";
import DashboardSearchInsightStats from "@/app/(admin)/admin/dashboard/DashboardSearchInsightStats";
import DashboardSecurityStats from "@/app/(admin)/admin/dashboard/DashboardSecurityStats";
import DashboardTagsStats from "@/app/(admin)/admin/dashboard/DashboardTagsStats";
import DashboardUsersStats from "@/app/(admin)/admin/dashboard/DashboardUsersStats";
import DashboardVisitStats from "@/app/(admin)/admin/dashboard/DashboardVisitStats";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/仪表盘",
    description: "快速查看站点当前状态",
  },
  {
    pathname: "/admin/dashboard",
  },
);

type ActionResponse<T> = {
  success: boolean;
  data: T | null;
};

async function resolveActionData<T>(
  action: () => Promise<ActionResponse<T>>,
): Promise<T | null> {
  try {
    const response = await action();
    return response.success && response.data ? response.data : null;
  } catch {
    return null;
  }
}

async function getDashboardInitialData() {
  const [
    doctorData,
    postsData,
    visitData,
    usersData,
    commentsData,
    mediaData,
    tagsData,
    categoriesData,
    projectsData,
    friendsData,
    searchLogData,
    searchIndexData,
    pagesData,
    securityData,
    auditData,
  ] = await Promise.all([
    resolveActionData(() => doctor({ force: false })),
    resolveActionData(() => getPostsStats({ force: false })),
    resolveActionData(() => getVisitStats({ force: false })),
    resolveActionData(() => getUsersStats({ force: false })),
    resolveActionData(() => getCommentStats({ force: false })),
    resolveActionData(() => getMediaStats({ days: 30, force: false })),
    resolveActionData(() => getTagsStats({ force: false })),
    resolveActionData(() => getCategoriesStats({ force: false })),
    resolveActionData(() => getProjectsStats({ force: false })),
    resolveActionData(() => getFriendLinksStats({ force: false })),
    resolveActionData(() => getSearchLogStats({ days: 30, force: false })),
    resolveActionData(() => getSearchIndexStats({ force: false })),
    resolveActionData(() => getPagesStats({ force: false })),
    resolveActionData(() => getSecurityOverview({ force: false })),
    resolveActionData(() => getAuditStats({ force: false })),
  ]);

  return {
    doctor: doctorData
      ? {
          issues: doctorData.issues,
          createdAt: doctorData.createdAt,
        }
      : null,
    posts: postsData,
    visit: visitData,
    users: usersData,
    comments: commentsData,
    media: mediaData,
    tags: tagsData,
    categories: categoriesData,
    projects: projectsData,
    friends: friendsData,
    searchInsight: searchLogData,
    searchIndex: searchIndexData,
    pages: pagesData,
    security: securityData,
    audit: auditData,
  };
}

export default async function AdminDashboard() {
  const initialData = await getDashboardInitialData();

  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax={true}
        enableFadeElements={true}
        enableLineReveal={true}
        snapToElements={false}
      >
        <AdminSidebar />
        <RowGrid>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardDoctor initialData={initialData.doctor} />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardPostsStats initialData={initialData.posts} />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardVisitStats initialData={initialData.visit} />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardUsersStats initialData={initialData.users} />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardCommentsStats initialData={initialData.comments} />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardMediaStats initialData={initialData.media} />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardTagsStats initialData={initialData.tags} />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardCategoriesStats initialData={initialData.categories} />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardProjectsStats initialData={initialData.projects} />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardFriendsStats initialData={initialData.friends} />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardSearchInsightStats
              initialData={initialData.searchInsight}
            />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardSearchIndexStats initialData={initialData.searchIndex} />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardPagesStats initialData={initialData.pages} />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardSecurityStats initialData={initialData.security} />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardAuditStats initialData={initialData.audit} />
          </GridItem>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
