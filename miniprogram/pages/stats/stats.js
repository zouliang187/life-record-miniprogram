const { formatDate } = require("../../utils/date");
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require("../../utils/share");
const { getAllRecords, getBodyMetrics } = require("../../utils/storage");
const { buildStats } = require("../../utils/calculator");

const WEEK_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const BODY_RANGES = [
  { key: "week", name: "本周" },
  { key: "month", name: "本月" },
  { key: "year", name: "本年" }
];

Page({
  data: {
    range: "week",
    stats: null,
    weekLabels: WEEK_LABELS,
    calendarCells: [],
    completionBars: [],
    durationBars: [],
    bodyRanges: BODY_RANGES,
    bodyRange: "week",
    bodyBars: [],
    bodyChartWidth: "100%",
    latestBodyMetric: null,
    latestBodyText: "暂无",
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
   * 切换体重趋势周期。
   * @param {object} e 点击事件
   */
  onBodyRangeTap(e) {
    this.setData({
      bodyRange: e.currentTarget.dataset.range
    });
    this.refreshBodyStats();
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
        color: "#5f9573",
        valueLabel: `${item.totalMinutes}分钟`
      })),
      chartWidth
    });
    this.refreshBodyStats();
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
        color: "#5f9573"
      },
      { title: "运动时长", value: `${moduleMap.exercise ? moduleMap.exercise.totalMinutes : 0}分钟`, color: "#df8f83" },
      { title: "阅读时长", value: `${moduleMap.reading ? moduleMap.reading.totalMinutes : 0}分钟`, color: "#73aaa3" },
      { title: "学习时长", value: `${moduleMap.english ? moduleMap.english.totalMinutes : 0}分钟`, color: "#d7b866" },
      { title: "睡眠平均分", value: `${this.getAverageSleepScore(records, stats.dates)}分`, color: "#8aaed0" }
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
  },

  /**
   * 刷新体重趋势统计。
   */
  refreshBodyStats() {
    const metrics = getBodyMetrics();
    const grouped = this.buildBodySeries(metrics, this.data.bodyRange);
    const maxWeight = Math.max.apply(null, grouped.map((item) => item.weight).concat([1]));
    const minWeight = Math.min.apply(null, grouped.map((item) => item.weight).concat([maxWeight]));
    const span = Math.max(1, maxWeight - minWeight);
    this.setData({
      latestBodyMetric: metrics[0] || null,
      latestBodyText: metrics[0] ? `${metrics[0].weight}kg / BMI ${metrics[0].bmi || "待计算"}` : "暂无",
      bodyBars: grouped.map((item) => ({
        label: item.label,
        percent: Math.max(8, Math.round(((item.weight - minWeight) / span) * 86 + 8)),
        color: "#78a88b",
        valueLabel: item.weight ? `${item.weight}kg` : ""
      })),
      bodyChartWidth: this.data.bodyRange === "year" ? "1280rpx" : "100%"
    });
  },

  /**
   * 根据周期生成体重趋势序列。
   * @param {Array<object>} metrics 身体指标记录
   * @param {string} range week/month/year
   * @returns {Array<object>} 图表序列
   */
  buildBodySeries(metrics, range) {
    if (range === "week") return this.buildWeeklyWeightSeries(metrics);
    if (range === "month") return this.buildMonthlyWeekWeightSeries(metrics);
    return this.buildYearlyWeightSeries(metrics);
  },

  /**
   * 本周按天展示体重。
   * @param {Array<object>} metrics 身体指标记录
   * @returns {Array<object>} 本周序列
   */
  buildWeeklyWeightSeries(metrics) {
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay() || 7;
    monday.setDate(today.getDate() - day + 1);
    return WEEK_LABELS.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateText = this.formatLocalDate(date);
      const metric = metrics.find((item) => item.date === dateText);
      return { label, weight: metric ? Number(metric.weight || 0) : 0 };
    });
  },

  /**
   * 本月按周平均展示体重。
   * @param {Array<object>} metrics 身体指标记录
   * @returns {Array<object>} 本月周均序列
   */
  buildMonthlyWeekWeightSeries(metrics) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const weeks = [1, 2, 3, 4, 5].map((week) => ({ label: `第${week}周`, values: [] }));
    metrics
      .filter((item) => item.date && item.date.indexOf(`${year}-${String(month).padStart(2, "0")}`) === 0)
      .forEach((item) => {
        const day = Number(item.date.slice(8));
        const weekIndex = Math.min(4, Math.floor((day - 1) / 7));
        weeks[weekIndex].values.push(Number(item.weight || 0));
      });
    return weeks.map((week) => ({
      label: week.label,
      weight: this.average(week.values)
    }));
  },

  /**
   * 本年按月平均展示体重。
   * @param {Array<object>} metrics 身体指标记录
   * @returns {Array<object>} 本年月均序列
   */
  buildYearlyWeightSeries(metrics) {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }).map((_, index) => {
      const month = String(index + 1).padStart(2, "0");
      const values = metrics
        .filter((item) => item.date && item.date.indexOf(`${year}-${month}`) === 0)
        .map((item) => Number(item.weight || 0));
      return {
        label: `${index + 1}月`,
        weight: this.average(values)
      };
    });
  },

  /**
   * 计算平均值。
   * @param {Array<number>} values 数值数组
   * @returns {number} 平均值
   */
  average(values) {
    const validValues = values.filter((value) => value > 0);
    if (!validValues.length) return 0;
    return Number((validValues.reduce((sum, value) => sum + value, 0) / validValues.length).toFixed(1));
  },

  /**
   * 格式化本地日期。
   * @param {Date} date 日期对象
   * @returns {string} YYYY-MM-DD
   */
  formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
});
