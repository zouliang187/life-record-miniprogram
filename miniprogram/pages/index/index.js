const { formatDate, getDisplayDate } = require("../../utils/date");
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require("../../utils/share");
const { getAllRecords, getRecordsByDate } = require("../../utils/storage");
const { MODULES, calculateOverallStreak } = require("../../utils/calculator");

const MODULE_META = {
  exercise: { title: "运动", icon: "动", color: "#ff6b6b" },
  reading: { title: "阅读", icon: "读", color: "#4ecdc4" },
  sleep: { title: "睡眠", icon: "睡", color: "#95e1d3" },
  english: { title: "英语", icon: "英", color: "#ffd93d" }
};

Page({
  data: {
    today: "",
    dateText: "",
    weekText: "",
    cards: [],
    streak: 0,
    completedCount: 0
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

      this.setData({
        today,
        dateText: display.dateText,
        weekText: display.weekText,
        cards,
        streak: calculateOverallStreak(allRecords, today),
        completedCount: todayRecords.length
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
        completedCount: 0
      });
    }
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
