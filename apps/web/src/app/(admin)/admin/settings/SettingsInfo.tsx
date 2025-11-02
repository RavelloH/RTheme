import Link from "@/components/Link";
import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";

export default function SettingsInfo() {
  return (
    <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
      <AutoTransition type="scale" className="h-full">
        <div
          className="flex flex-col justify-between p-10 h-full"
          key="content"
        >
          <div>
            <div className="text-2xl py-2">站点设置</div>
            <div>管理当前站点实例的配置信息。</div>
          </div>
          <div>
            有关配置项的详细文档，请参阅：
            <br />
            <Link
              href="https://docs.ravelloh.com/docs/settings"
              className="text-primary ml-auto"
              presets={["hover-underline", "arrow-out"]}
            >
              https://docs.ravelloh.com/docs/settings
            </Link>
          </div>
          <div>
            <div className="inline-flex items-center gap-2">
              选择下方的设置选项以查看或修改站点配置。
            </div>
          </div>
        </div>
      </AutoTransition>
    </GridItem>
  );
}
