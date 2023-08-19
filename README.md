<div align="center">

# RTheme - v3.0.0

新一代现代化极客风多功能横版静态博客主题框架  

// New generation modern geek style multifunctional horizontal static blog theme framework. //  

![GitHub last commit](https://img.shields.io/github/last-commit/RavelloH/RTheme?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/RavelloH/RTheme?style=for-the-badge)
![GitHub Repo stars](https://img.shields.io/github/stars/RavelloH/RTheme?style=for-the-badge)
</div>
  
## 预览  

预览: [RavelloH's Blog](https://ravelloh.top/) / [备用](https://ravelloh.github.io/)

![Screenshot_20230819_163309_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/b83fe77d-82ad-4d96-a1ba-c26e69f4eb1f)
![Screenshot_20230819_163340_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/8dda9083-2096-47f7-a868-565fc53a8ece)
![Screenshot_20230819_163447_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/d96d3c0d-c98a-4fc3-835a-57f2020e7bf7)
![Screenshot_20230819_163646_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/293cb420-25a7-4b34-8900-b137f107c196)
![Screenshot_20230819_163712_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/ee264ec0-58c4-4169-a7c0-2febfabf5f93)
![Screenshot_20230819_163426_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/b38705ad-945e-4fd7-8ec6-93537ff52153)


## 特性  
### 高性能  
得益于重新设计的主题框架，主题现在在性能方面已经登峰造极，在Google PageSpeed Insights测试中取得了400/400的满分成绩。[测试结果](https://pagespeed.web.dev/analysis/https-ravelloh-top/ojuiwt9vbw?form_factor=desktop)
![Screenshot_20230819_162842_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/a3e71d29-29ef-4a48-b8f8-ad52f9df8240)  
在实际体验中，RTheme使用Web Worker异步处理高负载任务，异步加载/执行渲染，避免阻塞页面；其主动预加载也降低了页面的加载延迟。
在v3版本的全面升级中，主题已经改造为单页应用程序，加之顺畅的内容过渡，流畅性大大提升。

### 自动化  
RTheme使用Github Actions在云端自动部署，无需本地干预，即可自动完成索引更新、自动订阅更新、站点地图更新、文章旁路推荐等功能。  
此外，RTheme优化了自身的架构，使得其编写文章十分简单----仅需要了解HTML语法即可。你也可以选择使用Markdown编辑。之后，其组件将在渲染时自动无感添加。  
![Screenshot_20230817_200552_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/6e554c22-5a2f-45be-bc94-82ed845775a3)  


### 响应式  
主题使用响应式设计，基准元素均使用flex/grid布局，在各尺寸屏幕上表现出色。
![Screenshot_20230819_165401_com kiwibrowser browser](https://github.com/RavelloH/RTheme/assets/68409330/ba0071fb-8e4d-4c90-8834-203cb478a880)
![Screenshot_20230819_165820_com android chrome_edit_386275673794257](https://github.com/RavelloH/RTheme/assets/68409330/2dc5f1ee-9d84-4a7b-8aa9-d7cd6f6bdef8)


### 功能丰富  
主题功能丰富，内置设置/分享/在线音乐播放/多站点测速/自动全站搜索/文章自定义排序/文章标签&分类自动索引/站点地图/RSS/Atom自动生成/文章自动推荐/内置高级下载器/主动型预加载/用户登录接口/外链截图API等等一系列功能，创造出属于极客的极致主题框架。  

### 函数化  
主题中除了用于管控初始化加载的`loading.js`，其余脚本均将各功能包装为函数，以保证其可复用性及无依赖无需加载性。  
![Screenshot_20230819_170439_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/2ffb3784-11ab-4326-9bd1-078d1ef17563)  
这使得二次开发十分简单，可直接复用主题框架中的功能。

### SEO友好  
主题自动根据页面内容生成两种格式的`sitemap`，优化搜索引擎抓取。  

### 全站搜索  
主题与可持续集成的RPageSearch深度集成，以提供静态站的全站高级搜索功能。
详见[RavelloH/RPageSearch](https://github.com/RavelloH/RPageSearch)。高性能/实时搜索/正则语法支持/异步/web worker/自动持续构建/可拓展数据格式，提供丰富的搜索功能。  
![Screenshot_20230812_214218_com android chrome](https://github.com/RavelloH/RTheme/assets/68409330/8244541c-c2c2-4893-a094-b49f2ac3d4fb)

### 自动订阅更新  
主题基于页面内容自动生成`RSS`、`Atom`、`JSON Feed`三种格式的订阅信息。

### 高兼容性  
主题最早支持到Chrome58(2017年4月19日),Firefox52(2017年3月7日),Opera45(2017年5月10日)，Safari，能够提供兼容性的保障。  
注：IE已死，不支持IE。
