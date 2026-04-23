const { formatDate, getDisplayDate } = require("../../utils/date");
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require("../../utils/share");
const { getAllRecords, getRecordsByDate } = require("../../utils/storage");
const { MODULES, calculateOverallStreak, buildStats } = require("../../utils/calculator");

const MODULE_META = {
  exercise: { title: "运动", icon: "动", color: "#df8f83" },
  reading: { title: "阅读", icon: "读", color: "#73aaa3" },
  sleep: { title: "睡眠", icon: "睡", color: "#8aaed0" },
  english: { title: "英语", icon: "英", color: "#d7b866" }
};

Page({
  data: {
    today: "",
    dateText: "",
    weekText: "",
    cards: [],
    streak: 0,
    completedCount: 0,
    completionRate: 0,
    ringClass: "ring-0",
    growthMessage: "今天先完成一个小动作，系统就开始向前滚动。",
    weekTrend: []
  },

  /**
   * 页面展示时刷新首页状态，确保打卡后返回能立即更新。
   */
  onShow() {
    enableShareMenu();
    this.refreshHome();
  },

  /**
   * 允许用户转发给朋友。
   * @returns {object} 分享内容
   */
  onShareAppMessage() {
    return getShareAppMessage();
  },

  /**
   * 允许用户分享到朋友圈。
   * @returns {object} 朋友圈分享内容
   */
  onShareTimeline() {
    return getShareTimeline();
  },

  /**
   * 组装今日卡片和连续打卡天数。
   */
  refreshHome() {
    try {
      const today = formatDate();
      const display = getDisplayDate(today);
      const todayRecords = getRecordsByDate(today);
      const allRecords = getAllRecords();
      const cards = MODULES.map((module) => {
        const record = todayRecords.find((item) => item.type === module.type);
        const meta = MODULE_META[module.type];
        return {
          type: module.type,
          title: meta.title,
          icon: meta.icon,
          color: meta.color,
          completed: !!record,
          statusText: record ? "已完成" : "未打卡",
          detailText: this.getRecordSummary(module.type, record)
        };
      });
      const completedCount = cards.filter((item) => item.completed).length;
      const completionRate = completedCount * 25;
      const weekStats = buildStats(allRecords, "week");

      this.setData({
        today,
        dateText: display.dateText,
        weekText: display.weekText,
        cards,
        streak: calculateOverallStreak(allRecords, today),
        completedCount,
        completionRate,
        ringClass: `ring-${completedCount}`,
        growthMessage: this.getGrowthMessage(completedCount),
        weekTrend: weekStats.daily.map((item) => ({
          label: item.dayLabel,
          percent: item.completionRate
        }))
      });
    } catch (error) {
      console.error("首页数据加载失败", error);
      const today = formatDate();
      const display = getDisplayDate(today);
      this.setData({
        today,
        dateText: display.dateText,
        weekText: display.weekText,
        cards: MODULES.map((module) => ({
          type: module.type,
          title: MODULE_META[module.type].title,
          icon: MODULE_META[module.type].icon,
          color: MODULE_META[module.type].color,
          completed: false,
          statusText: "未打卡",
          detailText: "点击快速打卡"
        })),
        streak: 0,
        completedCount: 0,
        completionRate: 0,
        ringClass: "ring-0",
        growthMessage: "今天先完成一个小动作，系统就开始向前滚动。",
        weekTrend: []
      });
    }
  },

  /**
   * 根据今日完成数量生成克制的成长提醒。
   * @param {number} completedCount 今日完成模块数
   * @returns {string} 首页提醒文案
   */
  getGrowthMessage(completedCount) {
    if (completedCount >= 4) return "四项都已完成，今天的自我管理很完整。";
    if (completedCount >= 3) return "只差一步，今天已经很接近满分状态。";
    if (completedCount >= 2) return "节奏已经起来了，再补一项会更稳。";
    if (completedCount >= 1) return "一个记录已经启动，继续保持轻量推进。";
    return "今天先完成一个小动作，系统就开始向前滚动。";
  },

  /**
   * 根据记录类型生成首页摘要。
   * @param {string} type 模块类型
   * @param {object|null} record 记录
   * @returns {string} 摘要文案
   */
  getRecordSummary(type, record) {
    if (!record) return "点击快速打卡";
    if (type === "exercise") return `${record.project} ${record.duration}分钟`;
    if (type === "reading") return `${record.bookName} ${record.duration}分钟`;
    if (type === "sleep") {
      const scoreText = record.watchScore !== "" && record.watchScore !== undefined ? `，手表 ${record.watchScore}分` : "";
      return `${record.duration}小时，质量 ${record.quality}星${scoreText}`;
    }
    if (type === "english") return `多邻国 ${record.totalDuration}分钟`;
    return "已记录";
  },

  /**
   * 跳转记录页并定位到指定模块。
   * @param {object} e 组件事件
   */
  onCardTap(e) {
    wx.setStorageSync("recordActiveType", e.detail.type);
    wx.switchTab({
      url: "/pages/record/record"
    });
  },

  /**
   * 跳转到记录页。
   */
  onQuickRecord() {
    wx.switchTab({ url: "/pages/record/record" });
  }
});
