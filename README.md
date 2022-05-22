# <div align="center">RTheme
```
  
 ____    ______  __                                                  __  __     _         __     
/\  _`\ /\__  _\/\ \                                                /\ \/\ \  /' \      /'__`\   
\ \ \L\ \/_/\ \/\ \ \___      __    ___ ___      __                 \ \ \ \ \/\_, \    /\_\L\ \  
 \ \ ,  /  \ \ \ \ \  _ `\  /'__`\/' __` __`\  /'__`\      _______   \ \ \ \ \/_/\ \   \/_/_\_<_ 
  \ \ \\ \  \ \ \ \ \ \ \ \/\  __//\ \/\ \/\ \/\  __/     /\______\   \ \ \_/ \ \ \ \  __/\ \L\ \
   \ \_\ \_\ \ \_\ \ \_\ \_\ \____\ \_\ \_\ \_\ \____\    \/______/    \ `\___/  \ \_\/\_\ \____/
    \/_/\/ /  \/_/  \/_/\/_/\/____/\/_/\/_/\/_/\/____/                  `\/__/    \/_/\/_/\/___/  
                                                                                                 
```

</div>
<div align="center">
  
**This document also supports [English](https://github.com/RavelloH/RTheme/blob/main/doc/README-En.md).**
</div>

## 演示
示例博客:https://ravelloh.github.io  
演示网站:https://ravelloh.github.io/RTheme
![](https://ravelloh.github.io/RTheme/img/screenshot1.png)
![](https://ravelloh.github.io/RTheme/img/screenshot2.png)
![](https://ravelloh.github.io/RTheme/img/screenshot3.png)
![](https://ravelloh.github.io/RTheme/img/screenshot4.png)
![](https://ravelloh.github.io/RTheme/img/screenshot5.png)
![](https://ravelloh.github.io/RTheme/img/screenshot6.png)
![](https://ravelloh.github.io/RTheme/img/screenshot7.png)
![](https://ravelloh.github.io/RTheme/img/screenshot8.png)
  
## 使用
- 直接在此Github仓库内选择使用此模板(推荐)
  - 选择此页面中的`Use this template`，在下一页面内自定义仓库，*注意:需要选择下方的`Include all branches`，之后在仓库设置中的Pages项中，选择以仓库的page分支作为GithubPages页面，保存即可
- 下载正式版ZIP:https://github.com/RavelloH/RTheme/archive/refs/heads/main.zip
- 或直接clone:https://github.com/RavelloH/RTheme.git
  
## 功能
### 实现的功能 
- [x] 响应式布局，最低适配至380*640，无上限
- [x] 横版布局，自动左右分栏
- [x] 顶栏/目录双索引，移动端分辨率不足时自动隐藏顶栏
- [x] 网页跳转特效
- [x] 目录/Copyright快捷更新，Copyright支持自动更新
- [x] 支持代码框，自动显示行数(代码高亮需引入外部js)
- [x] 图片大小自动调整，过大自动缩小
- [x] 内置常用icon，五种大小自定义
- [x] a标签hover特效且分有无下划线
- [x] 支持404页面
- [x] 支持打字机、Loading特效等
- [x] 底栏小icon
- [x] 文章更新时间计时
- [x] 以bold版字体文件代替`<b>`，更加美观
- [x] 自定义滚动条
- [x] 文字大小依分辨率调整
- [x] 内联页面自动预加载
- [x] 原生配色适应utteranc评论插件
- [x] 支持图片懒加载(默认关闭)
  
## 标签指南
* `<a>`  
   * class:  
       * button:白底黑字大按钮，带伸缩hover  
       * c:自带间隔，带变色hover
       * linkline:带虚线下划线
       * tag:标签用
       * m:目录索引用，同tag
* `<div>`  
    * class:  
        * text：文本区(分栏)
        * listline：有自动滚动条的div(分栏)
        * ~~codeline:代码块，已被pre平替~~
        * overlay：遮罩
        * headers：顶栏
        * center：元素居中
        * right：右对齐（默认左）
        * article：宽屏div（文章用）
        * menu：目录区域
        * showcase：显示区域(遮罩上)
        * toggle：目录按钮
    * id:
        * text：进入动画
        * active：退出动画
* `<ul>`
    * class:
        * social：左下小图标
* `<span>`:  
    注:span使用方法为class里同时写大小加类型，如大号“关于”的图标:`<span class="iconfontlarge icon-about"></span>`
   * class:
      * iconfont:50px图标
      * iconfontsmall:26px图标
      * iconfontmini:20px图标
      * iconfontbig:50px图标，带top12px
      * iconfontlarge:70px图标  
          以下icon效果请在<https://ravelloh.github.io/RTheme/documents/icon.html>中查看
      * icon-search
      * icon-about
      * icon-share
      * icon-note
      * icon-archive
      * icon-error
      * icon-tag
      * icon-gang
      * icon-home
      * icon-annotation
      * icon-classification
      * icon-aboutcircle
      * icon-clock
      * icon-app
      * icon-menu
      * icon-bilibili
      * icon-neteasemusic
      * icon-github
      * icon-article
      * icon-help
      * icon-link
      * icon-friend
      * icon-gift
      * icon-QR
      * icon-add
      * icon-del
      * icon-download
      * icon-bad
      * icon-right
      * icon-fujian
      * icon-code
      * icon-message
      * icon-fuzhi
      * icon-message
      * icon-like
      * icon-star
      * icon-lock
      * icon-good
      * icon-scan
      * icon-save
      * icon-flag
      * icon-upload
      * icon-more1
      * icon-more2
* `<p>`
  * class:  
      * typing:打字机特效
  
* 全局:
  * class:  
     * fl:元素左对齐(环绕)
     * fr:元素右对齐(环绕)
     * tc:文字居中
     * tr:文字右对齐
     * logoimg:头像
     * center:元素居中

## LICENCE
[MIT License](https://github.com/RavelloH/RTheme/blob/main/LICENSE)
