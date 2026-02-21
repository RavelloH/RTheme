import { GridItem } from "@/components/client/layout/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";

export default function BackupsInfo() {
  return (
    <GridItem areas={[1, 2, 3, 4]} width={3} height={0.8}>
      <AutoTransition type="scale" className="h-full">
        <div className="flex h-full flex-col justify-start p-10" key="content">
          <div className="py-2 text-2xl">备份还原</div>
          <div>在此处导入/导出 NeutralPress 的备份数据。</div>
          <div>
            若导入/导出的文件大小大于 4 MB，则需要先设置一个默认存储提供商，通过
            OSS 进行导入/导出。
          </div>
          <div>
            导出的 JSON
            文件中可能包含敏感信息（如凭据、用户数据等），请妥善保管，避免泄露给不信任的第三方。
          </div>
        </div>
      </AutoTransition>
    </GridItem>
  );
}
