/**
 * 配置类型工具
 *
 * 从 @/data/default-configs 自动推导类型
 *
 * @example
 * import { ConfigType } from "@/types/config";
 *
 * const shikiTheme = useConfig("site.theme") as ConfigType<"site.theme">;
 */

export type {
  ConfigType,
  ConfigKeys,
  ConfigTypeMap,
} from "@/data/default-configs";
