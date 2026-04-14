const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/**
 * 将数字补齐为两位字符。
 * @param {number|string} value 原始数字
 * @returns {string} 两位字符串
 */
function pad(value) {
  return String(value).padStart(2, "0");
}

/**
 * 格式化日期为 YYYY-MM-DD，避免 toISOString 带来的时区偏移。
 * @param {Date} date 日期对象
 * @returns {string} 日期字符串
 */
function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 解析 YYYY-MM-DD 字符串为本地 Date。
 * @param {string} dateString 日期字符串
 * @returns {Date} 日期对象
 */
function parseDate(dateString) {
  if (!DATE_FORMAT.test(dateString)) {
    throw new Error("日期格式必须为 YYYY-MM-DD");
  }
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 在指定日期上增减天数。
 * @param {string} dateString 日期字符串
 * @param {number} offset 偏移天数
 * @returns {string} 新日期字符串
 */
function addDays(dateString, offset) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + Number(offset));
  return formatDate(date);
}

/**
 * 获取中文日期展示信息。
 * @param {string} dateString 日期字符串
 * @returns {{dateText:string, weekText:string}} 中文日期和星期
 */
function getDisplayDate(dateString) {
  const date = parseDate(dateString);
  return {
    dateText: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
    weekText: WEEK_NAMES[date.getDay()]
  };
}

/**
 * 获取当前周周一到周日的日期列表。
 * @param {string} baseDate 基准日期
 * @returns {string[]} 一周日期数组
 */
function getWeekDates(baseDate = formatDate()) {
  const date = parseDate(baseDate);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  return Array.from({ length: 7 }).map((_, index) => {
    const item = new Date(monday);
    item.setDate(monday.getDate() + index);
    return formatDate(item);
  });
}

/**
 * 获取最近 N 天日期列表。
 * @param {number} count 天数
 * @param {string} endDate 结束日期
 * @returns {string[]} 日期数组
 */
function getRecentDates(count, endDate = formatDate()) {
  const end = parseDate(endDate);
  return Array.from({ length: count }).map((_, index) => {
    const item = new Date(end);
    item.setDate(end.getDate() - count + 1 + index);
    return formatDate(item);
  });
}

/**
 * 获取月份日历格子，补齐月初空白。
 * @param {number} year 年
 * @param {number} month 月，1-12
 * @returns {Array<{date:string, day:number, isBlank:boolean}>} 日历格子
 */
function getMonthCalendar(year, month) {
  const first = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const blanks = Array.from({ length: first.getDay() }).map(() => ({
    date: "",
    day: "",
    isBlank: true
  }));
  const days = Array.from({ length: totalDays }).map((_, index) => {
    const day = index + 1;
    return {
      date: `${year}-${pad(month)}-${pad(day)}`,
      day,
      isBlank: false
    };
  });
  return blanks.concat(days);
}

/**
 * 获取某个自然月的所有日期。
 * @param {string} baseDate 基准日期
 * @returns {string[]} 当月日期数组
 */
function getMonthDates(baseDate = formatDate()) {
  const date = parseDate(baseDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }).map((_, index) => `${year}-${pad(month)}-${pad(index + 1)}`);
}

module.exports = {
  WEEK_NAMES,
  addDays,
  formatDate,
  getDisplayDate,
  getMonthCalendar,
  getMonthDates,
  getRecentDates,
  getWeekDates,
  parseDate
};
