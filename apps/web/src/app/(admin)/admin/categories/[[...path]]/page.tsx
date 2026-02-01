import CategoriesDistributionChart from "@/app/(admin)/admin/categories/[[...path]]/CategoriesDistributionChart";
import CategoriesReport from "@/app/(admin)/admin/categories/[[...path]]/CategoriesReport";
import CategoriesTable from "@/app/(admin)/admin/categories/[[...path]]/CategoriesTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import {
  findCategoryByPath,
  getCategoryNamePath,
} from "@/lib/server/category-utils";
import { generateMetadata as generateSeoMetadata } from "@/lib/server/seo";

type Props = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  const categoryPath = path || [];

  // 获取当前分类信息
  let currentCategory = null;
  let categoryNamePath: string[] = [];

  if (categoryPath.length > 0) {
    currentCategory = await findCategoryByPath(categoryPath);
    if (currentCategory) {
      // 获取完整的名称路径
      categoryNamePath = await getCategoryNamePath(currentCategory.id);
    }
  }

  const title = currentCategory
    ? `管理面板/分类管理/${categoryNamePath.join("/")}`
    : "管理面板/分类管理";

  return generateSeoMetadata(
    {
      title,
      description: currentCategory
        ? `查看和管理"${currentCategory.name}"分类及其子分类`
        : "查看和管理分类",
    },
    {
      pathname: `/admin/categories${categoryPath.length > 0 ? `/${categoryPath.join("/")}` : ""}`,
    },
  );
}

export default async function AdminCategories({ params }: Props) {
  const { path } = await params;
  const categoryPath = path || [];

  // 获取当前分类信息
  let currentCategory = null;
  let parentId: number | null = null;
  let categoryNamePath: string[] = [];

  if (categoryPath.length > 0) {
    currentCategory = await findCategoryByPath(categoryPath);
    if (currentCategory) {
      parentId = currentCategory.id;
      // 获取完整的名称路径
      categoryNamePath = await getCategoryNamePath(currentCategory.id);
    }
  }

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
          <CategoriesReport
            parentId={parentId}
            categoryPath={categoryPath}
            currentCategory={currentCategory}
          />
          <CategoriesDistributionChart parentId={parentId} />
        </RowGrid>
        <RowGrid>
          <CategoriesTable
            parentId={parentId}
            categoryPath={categoryPath}
            categoryNamePath={categoryNamePath}
            currentCategory={currentCategory}
          />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
