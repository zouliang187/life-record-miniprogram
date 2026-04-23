const { formatDate, getMonthCalendar } = require("../../utils/date");
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require("../../utils/share");
const { getAllRecords, getRecordsByDate } = require("../../utils/storage");

const FILTERS = [
  { type: "all", name: "全部" },
  { type: "exercise", name: "运动" },
  { type: "reading", name: "阅读" },
  { type: "sleep", name: "睡眠" },
  { type: "english", name: "英语" }
];

Page({
  data: {
    year: 0,
    month: 0,
    years: [],
    yearIndex: 0,
    selectedDate: "",
    calendar: [],
    filters: FILTERS,
    filterType: "all",
    dayRecords: [],
    listRecords: []
  },

  /**
   * 初始化历史页日历。
   */
  onLoad() {
    const now = new Date();
    const years = Array.from({ length: 21 }).map((_, index) => String(now.getFullYear() - 10 + index));
    const yearIndex = years.indexOf(String(now.getFullYear()));
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      years,
      yearIndex,
      selectedDate: formatDate()
    });
    this.refreshHistory();
  },

  /**
   * 页面展示时刷新本地数据。
   */
  onShow() {
    enableShareMenu();
    this.refreshHistory();
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
   * 汇总日历和列表数据。
   */
  refreshHistory() {
    const allRecords = getAllRecords();
    const calendar = getMonthCalendar(this.data.year, this.data.month).map((item) => ({
      ...item,
      hasRecord: item.date ? allRecords.some((record) => record.date === item.date) : false,
      selected: item.date === this.data.selectedDate
    }));
    const listRecords = this.filterRecords(allRecords);
    this.setData({
      calendar,
      dayRecords: this.formatRecords(getRecordsByDate(this.data.selectedDate)),
      listRecords: this.formatRecords(listRecords)
    });
  },

  /**
   * 切换月份。
   * @param {object} e 点击事件
   */
  onMonthShift(e) {
    let year = this.data.year;
    let month = this.data.month + Number(e.currentTarget.dataset.offset);
    if (month < 1) {
      year -= 1;
      month = 12;
    }
    if (month > 12) {
      year += 1;
      month = 1;
    }
    const yearIndex = this.data.years.indexOf(String(year));
    this.setData({ year, month, yearIndex: Math.max(0, yearIndex) });
    this.refreshHistory();
  },

  /**
   * 切换年份。
   * @param {object} e picker 事件
   */
  onYearChange(e) {
    const yearIndex = Number(e.detail.value);
    const year = Number(this.data.years[yearIndex]);
    this.setData({ year, yearIndex });
    this.refreshHistory();
  },

  /**
   * 选择日历日期。
   * @param {object} e 点击事件
   */
  onDateTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    this.setData({ selectedDate: date });
    this.refreshHistory();
  },

  /**
   * 切换筛选类型。
   * @param {object} e 点击事件
   */
  onFilterTap(e) {
    this.setData({ filterType: e.currentTarget.dataset.type });
    this.refreshHistory();
  },

  /**
   * 按当前筛选过滤记录。
   * @param {Array<object>} records 全部记录
   * @returns {Array<object>} 过滤后的记录
   */
  filterRecords(records) {
    if (this.data.filterType === "all") return records;
    return records.filter((record) => record.type === this.data.filterType);
  },

  /**
   * 格式化记录摘要。
   * @param {Array<object>} records 记录数组
   * @returns {Array<object>} 展示记录
   */
  formatRecords(records) {
    const nameMap = {
      exercise: "运动",
      reading: "阅读",
      sleep: "睡眠",
      english: "英语"
    };
    return records.map((record) => ({
      ...record,
      typeName: nameMap[record.type],
      summary: this.getSummary(record)
    }));
  },

  /**
   * 获取单条记录摘要。
   * @param {object} record 单条记录
   * @returns {string} 摘要
   */
  getSummary(record) {
    if (record.type === "exercise") return `${record.duration}分钟（${record.project}）`;
    if (record.type === "reading") return `${record.duration}分钟（${record.bookName}）`;
    if (record.type === "sleep") {
      const scoreText = record.watchScore !== "" && record.watchScore !== undefined ? ` 手表${record.watchScore}分` : "";
      return `${record.duration}小时 ${"★".repeat(record.quality)}${scoreText}`;
    }
    if (record.type === "english") return `多邻国 ${record.totalDuration}分钟`;
    return "";
  }
});
