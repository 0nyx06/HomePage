# 0Nyx HomePage

个人主页源码。暗色页面、玉色强调、开源项目列表、项目详情页、奖项列表和技术栈 logo 轮播。

喜欢这个设计的话，可以直接 fork 或下载后改成自己的。

## 目录

```text
index.html              首页
styles.css              样式
script.js               交互
assets/                 头像、字体、favicon
projects/               项目详情页
meow/                   头像彩蛋
```

## 本地预览

这是静态站，没有构建步骤。

```bash
npx serve .
```

或用任意静态服务器打开仓库根目录。浏览器访问 `/` 即可。

## 改成自己的

1. 换 `assets/avatar.png`、`assets/favicon.png`、`assets/og.png`。
2. 改 `index.html` 里的名字、介绍、奖项和项目列表。
3. 在 `projects/` 下复制一份详情页，改标题和正文。
4. 联系方式和 GitHub 链接改成自己的。

资源路径都是相对路径，不依赖 0nyx.cn。

## 技术

HTML、CSS、原生 JavaScript。字体自托管。没有框架。
