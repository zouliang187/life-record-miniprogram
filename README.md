# 生活记录助手微信小程序

这是一个原生微信小程序版本的生活记录助手，覆盖运动、阅读、睡眠、英语学习四大模块，数据全部保存在用户本地。

## 项目结构

```text
miniprogram/
├─ app.js
├─ app.json
├─ app.wxss
├─ pages/
│  ├─ index/      # 首页：今日状态、快速打卡、连续打卡
│  ├─ record/     # 每日记录：四模块 Tab 表单
│  ├─ stats/      # 数据统计：周/月视图、热力图、图表组件
│  ├─ history/    # 历史记录：日历、日期详情、模块筛选
│  └─ profile/    # 个人中心：资料、目标、导出、AI 预留
├─ components/
│  ├─ record-card/
│  └─ stat-chart/
└─ utils/
   ├─ date.js        # 日期处理
   ├─ storage.js     # wx.setStorageSync 本地存储封装
   └─ calculator.js  # 统计、睡眠、BMI、AI 数据格式化
```

旧版 `pages/home`、`pages/stats/index`、`services` 和 `cloudfunctions` 目录仍保留在仓库中，但当前 `app.json` 已切换到本地存储版本，不再依赖云开发。

## 本地存储

- `records_2026`：按年份保存记录数组，同一天同模块只保留一条。
- `userProfile`：保存个人资料和目标设置。
- `appSettings`：保存主题、通知等应用设置。

## 已实现功能

- 首页展示今日日期、四模块完成状态、连续打卡天数。
- 每日记录页包含运动、阅读、睡眠、英语四个 Tab。
- 睡眠自动计算跨天时长，例如 23:00 到 07:00 计算为 8 小时。
- 英语学习总时长根据四个子模块自动累加。
- 统计页提供周视图和最近 30 天视图，包含热力图、完成率和时长统计。
- 历史页支持月历查看、日期详情和模块筛选。
- 个人中心支持资料设置、BMI 自动计算、目标设置、本地数据导出。
- `utils/calculator.js` 中已预留 `formatDataForAI` 和 `getAIAdvice`。

## 使用方式

1. 用微信开发者工具导入项目根目录：`C:\Users\18801\Documents\New project`
2. 确认 `project.config.json` 的 `miniprogramRoot` 为 `miniprogram/`
3. 编译运行即可开始本地打卡测试。

## 图表说明

当前 `components/stat-chart` 使用原生 WXML/WXSS 实现轻量图表，方便直接运行。后续如需接入 `echarts-for-weixin`，可以保留统计页数据结构，只替换 `stat-chart` 组件内部渲染。
