<div align="center">

# RTheme - v4

新一代现代化极客风多功能横版博客系统 - 基于Nextjs

// Next-gen modern geeky versatile horizontal blog system - Powered by Nextjs. //  

![GitHub last commit](https://img.shields.io/github/last-commit/RavelloH/RTheme?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/RavelloH/RTheme?style=for-the-badge)
![GitHub Repo stars](https://img.shields.io/github/stars/RavelloH/RTheme?style=for-the-badge)
</div>

## 比较
为什么你应该试试RTheme?

| 框架/功能   | 静态博客 | 动态博客 | RTheme |
| ------- | ---- | ---- | ------ |
| 文章实时更新  | ❌    | ✅    | ✅      |
| 免费部署    | ✅    | ❌    | ✅      |
| 内置内容管理  | ❌    | ✅    | ✅      |
| 自带评论系统  | ❌    | ✅    | ✅      |
| 不用定期维护  | ✅    | ❌    | ✅      |
| 静态SEO优化 | ✅    | ❌    | ✅      |
| 用户管理系统  | ❌    | ✅    | ✅      |
| 自带全站搜索  | ❌    | ✅    | ✅      |
| 站内消息系统  | ❌    | ✅    | ✅      |
| 草稿箱     | ❌    | ✅    | ✅      |

## 特点
- **现代化**：采用现代Web技术，如React、Next.js，提供快速、响应式的用户体验。
- **多功能**：支持多种博客功能，如文章分类、标签、搜索、评论、访问量统计（正在开发）等。
- **极客风格**：设计简洁、优雅，适合极客和开发者。
- **跨平台**：支持在多种设备上运行，包括桌面、移动设备等。
- **响应式**：自适应不同屏幕尺寸，提供一致的用户体验。
- **可定制**：提供丰富的自定义选项，满足个性化需求。
- **易于操作**：日常文稿增删改查均在站点内操作即可，无需写代码，自带Markdown编辑器。
- **易于部署**：可使用vercel快速部署，也可使用其他云平台或VPS。
- **持续更新**：主题将不断更新，以提供更好的功能和体验。
- **自带后台**：此博客自带管理后台，游客也可注册并登录账户。
- **低成本**：使用vercel或neon提供的免费postgres数据库可免费部署。
- **过渡自然**：元素切换使用自研淡入淡出函数处理，过渡自然流畅。
- **SEO友好**：自带RSS与Sitemap，SEO友好。
- **消息中心**: 自带消息中心，显示各类通知(评论/回复/站内信)
- **自带评论系统**: 无需其他任何第三方评论系统，自带markdown语法支持
- **AES-128加密的即时聊天**: 自带加密，接入博客消息系统
  
## 预览  

预览: [RavelloH's Blog](https://ravelloh.top/)  

![homepage](https://raw.ravelloh.top/rtheme/homepage.webp)
![signin](https://raw.ravelloh.top/rtheme/signin.webp)
![editor](https://raw.ravelloh.top/rtheme/editor.webp)
![menu](https://raw.ravelloh.top/rtheme/menu.webp)
![categories](https://raw.ravelloh.top/rtheme/categories.webp)
![user-dashboard](https://raw.ravelloh.top/rtheme/user-dashboard.webp)
![user](https://raw.ravelloh.top/rtheme/user.webp)
![post-index](https://raw.ravelloh.top/rtheme/post-index.webp)

![Screenshot_20230819_163340_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/8dda9083-2096-47f7-a868-565fc53a8ece)
![Screenshot_20230819_163447_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/d96d3c0d-c98a-4fc3-835a-57f2020e7bf7)
![Screenshot_20230819_163646_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/293cb420-25a7-4b34-8900-b137f107c196)
![Screenshot_20230819_163712_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/ee264ec0-58c4-4169-a7c0-2febfabf5f93)
![Screenshot_20230819_163426_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/b38705ad-945e-4fd7-8ec6-93537ff52153)
![image](https://github.com/user-attachments/assets/a5e3b8ec-4f66-42be-949a-b168f6d0ad3c)
![image](https://github.com/user-attachments/assets/700f7a20-592f-4199-b84f-62331a2c9303)
![image](https://github.com/user-attachments/assets/8a4959ff-9c2d-4291-ae99-c40d2d83179b)
![image](https://github.com/user-attachments/assets/df934b22-aca5-4dd2-a7f1-c4d11699fcc1)


---


## 特性  
### 高性能  
得益于重新设计的主题框架，主题现在在性能方面已经登峰造极，在Google PageSpeed Insights测试中取得了400/400的满分成绩。[测试结果](https://pagespeed.web.dev/analysis/https-ravelloh-top/ojuiwt9vbw?form_factor=desktop)
![Screenshot_20230819_162842_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/a3e71d29-29ef-4a48-b8f8-ad52f9df8240)  
在实际体验中，RTheme使用Web Worker异步处理高负载任务，异步加载/执行渲染，避免阻塞页面；其主动预加载也降低了页面的加载延迟。
在v3版本的全面升级中，主题已经改造为单页应用程序，加之顺畅的内容过渡，流畅性大大提升。

### 响应式  
主题使用响应式设计，基准元素均使用flex/grid布局，在各尺寸屏幕上表现出色。
![Screenshot_20230819_165401_com kiwibrowser browser](https://github.com/RavelloH/RTheme/assets/68409330/ba0071fb-8e4d-4c90-8834-203cb478a880)
![Screenshot_20230819_165820_com android chrome_edit_386275673794257](https://github.com/RavelloH/RTheme/assets/68409330/2dc5f1ee-9d84-4a7b-8aa9-d7cd6f6bdef8)


### SEO友好  
主题自动根据页面内容生成两`sitemap`，同时使用Nextjs的OG优化，优化搜索引擎抓取。  

### 自动订阅更新  
主题基于页面内容自动生成`RSS`，方便他人更新订阅

### 高兼容性  
主题最早支持到Chrome58(2017年4月19日),Firefox52(2017年3月7日),Opera45(2017年5月10日)，Safari，能够提供兼容性的保障。  
注：IE已死，不支持IE。

### 单页应用程序  
主题使用PJAX技术进行页面加载，并在页面加载切换之间加入过渡动画。  
另外，主题也会在页面加载时更新左下角的进度条，以展示正在加载/加载超时/加载完成/加载失败等不同场景。
![Screenshot_20230819_175635_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/160277fb-e8c1-4af9-9b3c-48c7bd23e9f0)

### 原生音乐播放器
主题内置原生音乐播放器，支持播放/切换/跳转/循环等功能，且可进行在线搜索以使用在线资源，同时也支持与你的网易云音乐歌单同步，创建默认播放列表。
![Screenshot_20230819_163646_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/293cb420-25a7-4b34-8900-b137f107c196)


### 代码高亮  
主题使用[Shiki](https://github.com/shikijs/shiki)代码高亮，并在其基础上使用Web Worker并行加载，防止页面阻塞。  
![Screenshot_20230819_182502_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/3c71231d-dd54-4b85-9fcf-4f1eb01097d8)

### 标签&分类自动索引
主题能自动根据文章信息索引具有相应标签/分类的文章。

### 设置自定义  
主题可进行各式设置，以提供个性化体验。  
设置项使用cookie存储，并且使用列表快速创建，保证其易用性。  
![Screenshot_20230819_183116_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/834ceb8e-fcdf-4404-b8df-76a6594f61ae)
![Screenshot_20230819_183151_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/4bf9efab-5b84-4777-a6e6-55af41c64ecd)

### 自动目录索引
主题可根据文章内标题自动生成目录，并高亮阅读项，以提高阅读体验。
![Screenshot_20230819_183406_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/33954e5b-c1e8-4e9a-a7d3-e4378e3b6b59)

### 文章旁路推荐
文章结尾自动推荐上一篇/下一篇文章，无需手动设置。效果见上方图片。

### 完整的用户系统
可查看用户动态，包括文稿、手记、评论、关注、关注者。

### 自动友链系统
对方在此博客注册账号并设置昵称、签名、网站地址后，管理员只需使用管理账户关注此用户，即可将其自动添加入友链中。内容实时更新，对方仅需修改自己的账户信息即可同步修改其友链信息。



---

## 使用  
你可以直接使用vercle部署，也可以使用vps等部署方式。

> 参阅[https://ravelloh.top/posts/rthemev4-deployment-complete-guide](https://ravelloh.top/posts/rthemev4-deployment-complete-guide)  

## 开发  
欢迎改进/修复/增加主题的功能。你可以使用nodejs在本地查看更改。
```shell
git clone https://github.com/RavelloH/RTheme
cd RTheme
pnpm install
pnpm dev
```

## Licence
MIT

