const { addDays, formatDate, getMonthDates, getWeekDates } = require("./date");

const MODULES = [
  { type: "exercise", name: "运动", color: "#ff6b6b" },
  { type: "reading", name: "阅读", color: "#4ecdc4" },
  { type: "sleep", name: "睡眠", color: "#95e1d3" },
  { type: "english", name: "英语", color: "#ffd93d" }
];

/**
 * 计算睡眠时长，支持跨天。
 * @param {string} bedTime 入睡时间 HH:mm
 * @param {string} wakeTime 起床时间 HH:mm
 * @returns {number} 睡眠小时数
 */
function calculateSleepDuration(bedTime, wakeTime) {
  const [bedHour, bedMinute] = bedTime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
  const bedTotal = bedHour * 60 + bedMinute;
  let wakeTotal = wakeHour * 60 + wakeMinute;
  if (wakeTotal <= bedTotal) {
    wakeTotal += 24 * 60;
  }
  return Number(((wakeTotal - bedTotal) / 60).toFixed(1));
}

/**
 * 根据运动类型和时长估算消耗热量。
 * @param {string} project 运动项目
 * @param {number} duration 运动分钟
 * @returns {number} 估算热量
 */
function estimateCalories(project, duration) {
  const factorMap = {
    篮球: 8,
    跑步: 9,
    居家健身: 6,
    户外徒步: 5,
    游泳: 8,
    骑行: 7,
    瑜伽: 4,
    其他: 5
  };
  return Math.round((factorMap[project] || 5) * Number(duration || 0));
}

/**
 * 计算 BMI。
 * @param {number|string} height 身高 cm
 * @param {number|string} weight 体重 kg
 * @returns {string} BMI 字符串
 */
function calculateBmi(height, weight) {
  const heightValue = Number(height);
  const weightValue = Number(weight);
  if (!heightValue || !weightValue) return "";
  return (weightValue / Math.pow(heightValue / 100, 2)).toFixed(2);
}

/**
 * 获取记录可计入统计的分钟数。
 * @param {object} record 单条记录
 * @returns {number} 分钟数
 */
function getRecordMinutes(record) {
  if (!record) return 0;
  if (record.type === "sleep") return Math.round(Number(record.duration || 0) * 60);
  if (record.type === "english") return Number(record.totalDuration || 0);
  return Number(record.duration || 0);
}

/**
 * 获取运动、阅读、英语三类生产性时长，睡眠不计入总时长统计。
 * @param {object} record 单条记录
 * @returns {number} 分钟数
 */
function getProductiveMinutes(record) {
  if (!record || record.type === "sleep") return 0;
  return getRecordMinutes(record);
}

/**
 * 判断某日某模块是否完成。
 * @param {Array<object>} records 全部记录
 * @param {string} date 日期字符串
 * @param {string} type 模块类型
 * @returns {boolean} 是否完成
 */
function hasCompleted(records, date, type) {
  return records.some((record) => record.date === date && record.type === type);
}

/**
 * 计算所有模块综合连续打卡天数，要求每天至少有一条记录。
 * @param {Array<object>} records 全部记录
 * @param {string} baseDate 基准日期
 * @returns {number} 连续天数
 */
function calculateOverallStreak(records, baseDate = formatDate()) {
  let streak = 0;
  let cursor = baseDate;
  while (records.some((record) => record.date === cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * 计算指定模块连续打卡天数。
 * @param {Array<object>} records 全部记录
 * @param {string} type 模块类型
 * @param {string} baseDate 基准日期
 * @returns {number} 连续天数
 */
function calculateModuleStreak(records, type, baseDate = formatDate()) {
  let streak = 0;
  let cursor = baseDate;
  while (hasCompleted(records, cursor, type)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * 汇总一段日期的完成率和时长。
 * @param {Array<object>} records 全部记录
 * @param {string[]} dates 日期数组
 * @returns {object} 统计结果
 */
function summarizeByDates(records, dates) {
  const daily = dates.map((date) => {
    const dayRecords = records.filter((record) => record.date === date);
    const completedCount = MODULES.filter((item) => hasCompleted(records, date, item.type)).length;
    const totalMinutes = dayRecords.reduce((sum, record) => sum + getProductiveMinutes(record), 0);
    return {
      date,
      dayLabel: date.slice(5),
      completedCount,
      completionRate: Math.round((completedCount / MODULES.length) * 100),
      totalMinutes,
      modules: MODULES.map((module) => ({
        ...module,
        completed: hasCompleted(records, date, module.type)
      }))
    };
  });

  const moduleSummary = MODULES.map((module) => {
    const moduleRecords = records.filter((record) => dates.includes(record.date) && record.type === module.type);
    const totalMinutes = moduleRecords.reduce((sum, record) => sum + getRecordMinutes(record), 0);
    return {
      ...module,
      count: moduleRecords.length,
      totalMinutes,
      completionRate: Math.round((moduleRecords.length / dates.length) * 100)
    };
  });

  return { daily, moduleSummary };
}

/**
 * 获取统计页使用的数据模型。
 * @param {Array<object>} records 全部记录
 * @param {string} range week 或 month
 * @returns {object} 统计模型
 */
function buildStats(records, range) {
  const dates = range === "week" ? getWeekDates() : getMonthDates();
  const summary = summarizeByDates(records, dates);
  return {
    range,
    dates,
    ...summary,
    totalMinutes: summary.daily.reduce((sum, item) => sum + item.totalMinutes, 0),
    averageCompletionRate: Math.round(
      summary.daily.reduce((sum, item) => sum + item.completionRate, 0) / summary.daily.length
    )
  };
}

/**
 * 为未来 AI 分析接口整理统一数据。
 * @param {Array<object>} records 记录数组
 * @param {object} userInfo 用户资料
 * @returns {object} AI 请求数据
 */
function formatDataForAI(records, userInfo) {
  const recentStats = buildStats(records, "week");
  const exercise = recentStats.moduleSummary.find((item) => item.type === "exercise");
  const reading = recentStats.moduleSummary.find((item) => item.type === "reading");
  const sleepRecords = records.filter((record) => record.type === "sleep");
  return {
    user_profile: userInfo,
    records,
    statistics: {
      weekly_exercise_avg: Math.round((exercise.totalMinutes || 0) / 7),
      weekly_reading_avg: Math.round((reading.totalMinutes || 0) / 7),
      weekly_sleep_avg: sleepRecords.length
        ? Number((sleepRecords.reduce((sum, item) => sum + Number(item.duration || 0), 0) / sleepRecords.length).toFixed(1))
        : 0,
      english_streak: calculateModuleStreak(records, "english")
    },
    request_type: "lifestyle_advice"
  };
}

/**
 * AI 建议接口占位，后续可接入云函数或第三方服务。
 * @returns {Promise<object>} 暂未接入提示
 */
async function getAIAdvice() {
  return Promise.resolve({
    available: false,
    message: "AI 建议接口暂未接入"
  });
}

module.exports = {
  MODULES,
  buildStats,
  calculateBmi,
  calculateModuleStreak,
  calculateOverallStreak,
  calculateSleepDuration,
  estimateCalories,
  formatDataForAI,
  getAIAdvice,
  getProductiveMinutes,
  getRecordMinutes,
  hasCompleted
};
