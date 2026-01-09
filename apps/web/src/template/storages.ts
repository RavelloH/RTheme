export type StorageProviderType =
  | "LOCAL"
  | "AWS_S3"
  | "GITHUB_PAGES"
  | "VERCEL_BLOB"
  | "EXTERNAL_URL";

export interface ConfigItem {
  value: string;
  description: string;
  /** 是否必填，仅用于前端校验 */
  required?: boolean;
}

export type StorageConfigTemplate = Record<string, ConfigItem>;

export const STORAGE_PROVIDER_CONFIG_TEMPLATES: Record<
  StorageProviderType,
  StorageConfigTemplate
> = {
  /**
   * 1. 本地存储（LOCAL）
   * 数据库存的 baseUrl：对外访问的基础 URL，例如：https://example.com/uploads
   * config 里主要是“服务器上的实际路径”等信息。
   */
  LOCAL: {
    rootDir: {
      value: "/var/www/uploads",
      description:
        "服务器本地存储的根目录绝对路径。示例：/var/www/uploads。文件最终会存储在 rootDir + 路径模板 生成的路径下。",
      required: true,
    },
    createDirIfNotExists: {
      value: "true",
      description: "是否在目录不存在时自动创建目录。true/false 字符串。",
    },
    fileMode: {
      value: "0644",
      description:
        "可选：新建文件的权限（Unix 文件权限），如 0644。留空则使用系统默认。",
    },
    dirMode: {
      value: "0755",
      description:
        "可选：新建目录的权限（Unix 目录权限），如 0755。留空则使用系统默认。",
    },
  },

  /**
   * 2. AWS S3 / 兼容 S3 的对象存储
   * 数据库中的 baseUrl：建议配置为最终访问 URL 前缀（例如 https://your-cdn.com 或 https://bucket.s3.ap-southeast-1.amazonaws.com）
   */
  AWS_S3: {
    accessKeyId: {
      value: "",
      description:
        "AWS Access Key ID，或兼容 S3 对象存储的访问密钥 ID。需要具备对目标 Bucket 的读写权限。",
      required: true,
    },
    secretAccessKey: {
      value: "",
      description:
        "AWS Secret Access Key，或兼容 S3 对象存储的访问密钥 Secret。请妥善保管，不要泄露。",
      required: true,
    },
    region: {
      value: "ap-southeast-1",
      description:
        "Bucket 所在区域，例如 ap-southeast-1。兼容 S3 的对象存储请填写其对应 Region 名称。",
      required: true,
    },
    bucket: {
      value: "",
      description: "S3 Bucket 名称，例如 my-cms-bucket。",
      required: true,
    },
    endpoint: {
      value: "",
      description:
        "可选：自定义 Endpoint，例如 https://s3.amazonaws.com 或兼容 S3 对象存储的访问域名。不填则使用 AWS 官方默认 Endpoint。",
    },
    basePath: {
      value: "uploads",
      description:
        "可选：Bucket 内的根目录前缀，例如 uploads 或 site-a/media。留空则直接从 Bucket 根目录开始存储。",
    },
    forcePathStyle: {
      value: "false",
      description:
        "是否启用 path-style 访问（例如 http://endpoint/bucket/key）。某些兼容 S3 服务或内网环境需要设为 true。true/false 字符串。",
    },
    acl: {
      value: "public-read",
      description:
        "上传对象使用的 ACL。常见值：public-read 或 private。若你通过 CloudFront / 代理控制访问，可以设置为 private。",
    },
  },

  /**
   * 3. Vercel Blob
   * 一般在 Vercel Dashboard 创建 Blob Store 后，会生成一个 BLOB_READ_WRITE_TOKEN 环境变量。
   * 数据库中的 baseUrl：建议配置为 Blob 公网访问的基础 URL（如你绑定的自定义域名）。
   */
  VERCEL_BLOB: {
    token: {
      value: "",
      description:
        "Vercel Blob 的读写 Token，通常来自 Vercel 环境变量 BLOB_READ_WRITE_TOKEN。需要拥有对目标 Blob Store 的读写权限。",
      required: true,
    },
    basePath: {
      value: "cms-media",
      description:
        "可选：在 Blob key 前添加的统一前缀，例如 cms-media 或 uploads/images，用于将同一应用的文件归类存放。",
    },
    access: {
      value: "public",
      description:
        "上传文件的访问级别。常见值：public（公开访问）或 private（仅通过签名 URL 访问）。具体含义以 Vercel Blob 当前文档为准。",
    },
    cacheControl: {
      value: "public,max-age=31536000,immutable",
      description:
        "可选：写入对象时设置的 Cache-Control 响应头，控制浏览器和 CDN 缓存策略。",
    },
  },

  /**
   * 4. GitHub 仓库 / GitHub Pages
   * 你可以把文件存到某个仓库里，再通过 raw.githubusercontent.com、GitHub Pages 或自己的构建流程暴露为静态资源。
   * 数据库中的 baseUrl：配置为最终访问这些静态文件的 URL 前缀（例如 https://user.github.io/repo 或 https://static.example.com）。
   */
  GITHUB_PAGES: {
    owner: {
      value: "",
      description:
        "GitHub 仓库拥有者用户名或组织名，例如: your-github-username。",
      required: true,
    },
    repo: {
      value: "",
      description: "GitHub 仓库名，例如: cms-assets。",
      required: true,
    },
    branch: {
      value: "main",
      description:
        "用于存储静态文件的分支名称，例如 main、master 或 gh-pages。请确保 CI/CD 或 GitHub Pages 使用该分支作为构建源。",
      required: true,
    },
    token: {
      value: "",
      description:
        "GitHub Personal Access Token（PAT），需要至少具备 repo 权限，用于通过 GitHub API 推送文件/创建提交。建议只给该仓库最小必要权限。",
      required: true,
    },
    basePath: {
      value: "public/uploads",
      description:
        "仓库内用于存放资源文件的目录前缀，例如 public/uploads 或 static/media。文件最终会被写入该目录下。",
    },
    committerName: {
      value: "CMS Bot",
      description: "提交时使用的提交者姓名（Git 提交作者），例如 CMS Bot。",
    },
    committerEmail: {
      value: "cms-bot@example.com",
      description:
        "提交时使用的提交者邮箱（Git 提交作者邮箱）。可以使用一个机器人邮箱地址。",
    },
    apiBaseUrl: {
      value: "https://api.github.com",
      description:
        "GitHub API 的基础地址。公共 GitHub 保持默认即可；如使用 GitHub Enterprise，请填写企业 GitHub API 地址。",
    },
    commitMessageTemplate: {
      value: "chore(cms): upload {{filename}}",
      description:
        "可选：提交信息模板，支持使用 {{filename}}、{{datetime}} 等占位符（具体实现由后端决定）。",
    },
  },

  /**
   * 5. 外部 URL 存储
   * 此存储类型用于直接使用外部 URL 作为文件存储方式，无需实际上传文件。
   * 数据库中的 baseUrl：配置为文件访问的基础 URL。
   */
  EXTERNAL_URL: {
    // EXTERNAL_URL 存储类型无需配置项，所有文件直接使用 baseUrl + pathTemplate
  },
};
