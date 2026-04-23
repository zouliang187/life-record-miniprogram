const { formatDate } = require("../../utils/date");
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require("../../utils/share");
const { getAllRecords } = require("../../utils/storage");
const { buildStats } = require("../../utils/calculator");

const WEEK_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

Page({
  data: {
    range: "week",
    stats: null,
    weekLabels: WEEK_LABELS,
    calendarCells: [],
    completionBars: [],
    durationBars: [],
    overviewCards: [],
    chartWidth: "100%"
  },

  /**
   * 页面展示时刷新统计数据。
   */
  onShow() {
    enableShareMenu();
    this.refreshStats();
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
   * 切换周视图/月视图。
   * @param {object} e 点击事件
   */
  onRangeTap(e) {
    this.setData({
      range: e.currentTarget.dataset.range
    });
    this.refreshStats();
  },

  /**
   * 读取本地记录并构造图表数据。
   */
  refreshStats() {
    const records = getAllRecords();
    const stats = buildStats(records, this.data.range);
    stats.daily = stats.daily.map((item) => ({
      ...item,
      dayText: item.date.slice(8),
      weekName: this.getWeekName(item.date),
      monthRecord: this.data.range === "month" && item.completedCount > 0
    }));
    const maxMinutes = Math.max.apply(null, stats.daily.map((item) => item.totalMinutes).concat([1]));
    const chartWidth = this.data.range === "month" ? `${Math.max(720, stats.daily.length * 104)}rpx` : "100%";
    this.setData({
      stats,
      calendarCells: this.buildCalendarCells(stats.daily),
      overviewCards: this.buildOverviewCards(stats, records),
      completionBars: stats.daily.map((item) => ({
        label: item.dayLabel,
        percent: item.completionRate,
        valueLabel: `${item.completionRate}%`
      })),
      durationBars: stats.daily.map((item) => ({
        label: item.dayLabel,
        percent: Math.round((item.totalMinutes / maxMinutes) * 100),
        color: "#1989fa",
        valueLabel: `${item.totalMinutes}分钟`
      })),
      chartWidth
    });
  },

  /**
   * 构造顶部统计卡片，完成率按今日四项是否填写计算。
   * @param {object} stats 统计模型
   * @param {Array<object>} records 全部记录
   * @returns {Array<object>} 顶部卡片
   */
  buildOverviewCards(stats, records) {
    const today = formatDate();
    const todayStats = stats.daily.find((item) => item.date === today) || { completionRate: 0 };
    const recordedDays = stats.daily.filter((item) => item.completedCount > 0).length;
    const monthRate = Number(((recordedDays / stats.daily.length) * 100).toFixed(2));
    const moduleMap = stats.moduleSummary.reduce((map, item) => {
      map[item.type] = item;
      return map;
    }, {});
    return [
      {
        title: stats.range === "month" ? "本月完成率" : "今日完成率",
        value: stats.range === "month" ? `${monthRate}%` : `${todayStats.completionRate}%`,
        color: "#07c160"
      },
      { title: "运动时长", value: `${moduleMap.exercise ? moduleMap.exercise.totalMinutes : 0}分钟`, color: "#ff6b6b" },
      { title: "阅读时长", value: `${moduleMap.reading ? moduleMap.reading.totalMinutes : 0}分钟`, color: "#4ecdc4" },
      { title: "学习时长", value: `${moduleMap.english ? moduleMap.english.totalMinutes : 0}分钟`, color: "#ffd93d" },
      { title: "睡眠平均分", value: `${this.getAverageSleepScore(records, stats.dates)}分`, color: "#95e1d3" }
    ];
  },

  /**
   * 计算指定日期范围内的运动手表睡眠平均分。
   * @param {Array<object>} records 全部记录
   * @param {string[]} dates 日期范围
   * @returns {number} 平均分
   */
  getAverageSleepScore(records, dates) {
    const scores = records
      .filter((record) => record.type === "sleep" && dates.includes(record.date))
      .map((record) => Number(record.watchScore))
      .filter((score) => !Number.isNaN(score) && score > 0);
    if (!scores.length) return 0;
    return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
  },

  /**
   * 获取日期对应的中文周几。
   * @param {string} dateString 日期字符串
   * @returns {string} 周几
   */
  getWeekName(dateString) {
    const date = new Date(dateString.replace(/-/g, "/"));
    return WEEK_LABELS[(date.getDay() + 6) % 7];
  },

  /**
   * 构造热力图格子，月视图按周一到周日补齐空白。
   * @param {Array<object>} daily 每日统计
   * @returns {Array<object>} 日历格子
   */
  buildCalendarCells(daily) {
    if (this.data.range === "week" || !daily.length) return daily;
    const firstDate = new Date(daily[0].date.replace(/-/g, "/"));
    const blankCount = (firstDate.getDay() + 6) % 7;
    const blanks = Array.from({ length: blankCount }).map((_, index) => ({
      date: `blank-${index}`,
      isBlank: true
    }));
    return blanks.concat(daily);
  }
});
