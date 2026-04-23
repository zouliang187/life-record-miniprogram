const { formatDate } = require("./date");

const PROFILE_KEY = "userProfile";
const SETTINGS_KEY = "appSettings";
const BODY_METRICS_KEY = "bodyMetrics";
const TYPE_ORDER = ["exercise", "reading", "sleep", "english"];

/**
 * 安全读取数组，避免旧缓存或脏数据导致页面启动失败。
 * @param {string} key 本地存储 key
 * @returns {Array<object>} 数组数据
 */
function getArrayStorage(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

/**
 * 获取记录年份对应的本地存储 key。
 * @param {string} date 日期字符串
 * @returns {string} 存储 key
 */
function getRecordKey(date = formatDate()) {
  const year = String(date).slice(0, 4);
  return `records_${year}`;
}

/**
 * 读取指定年份的全部记录。
 * @param {number|string} year 年份
 * @returns {Array<object>} 记录数组
 */
function getRecordsByYear(year = new Date().getFullYear()) {
  return getArrayStorage(`records_${year}`);
}

/**
 * 读取所有年份记录。
 * @returns {Array<object>} 全部记录数组
 */
function getAllRecords() {
  const info = wx.getStorageInfoSync();
  return info.keys
    .filter((key) => /^records_\d{4}$/.test(key))
    .reduce((list, key) => list.concat(getArrayStorage(key)), [])
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * 读取某一天的全部记录。
 * @param {string} date 日期字符串
 * @returns {Array<object>} 当日记录
 */
function getRecordsByDate(date) {
  return getRecordsByYear(date.slice(0, 4)).filter((record) => record.date === date);
}

/**
 * 读取某一天某个模块的记录。
 * @param {string} date 日期字符串
 * @param {string} type 模块类型
 * @returns {object|null} 模块记录
 */
function getRecordByType(date, type) {
  return getRecordsByDate(date).find((record) => record.type === type) || null;
}

/**
 * 保存一条记录，同一天同模块会被覆盖更新。
 * @param {object} record 业务记录
 * @returns {object} 保存后的记录
 */
function saveRecord(record) {
  const date = record.date || formatDate();
  const key = getRecordKey(date);
  const records = getArrayStorage(key);
  const normalized = {
    ...record,
    date,
    timestamp: record.timestamp || Date.now(),
    updatedAt: Date.now()
  };
  const nextRecords = records.filter((item) => !(item.date === date && item.type === normalized.type));
  nextRecords.push(normalized);
  nextRecords.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  wx.setStorageSync(key, nextRecords);
  return normalized;
}

/**
 * 删除指定日期和模块的记录。
 * @param {string} date 日期字符串
 * @param {string} type 模块类型
 */
function deleteRecord(date, type) {
  const key = getRecordKey(date);
  const records = getArrayStorage(key);
  wx.setStorageSync(key, records.filter((item) => !(item.date === date && item.type === type)));
}

/**
 * 读取用户资料，缺省值用于页面初始化。
 * @returns {object} 用户资料
 */
function getUserProfile() {
  return normalizeProfile(wx.getStorageSync(PROFILE_KEY) || {
    userInfo: {
      nickname: "",
      avatarUrl: "",
      roleName: "自我管理者",
      height: "",
      weight: "",
      bmi: "",
      birthDate: "1990-01-01",
      gender: "男"
    },
    goals: {
      exercise: { weeklyCount: 5, weeklyDuration: 300 },
      reading: { dailyDuration: 60 },
      sleep: { dailyDuration: 8 },
      english: { streakDays: 100 }
    }
  });
}

/**
 * 兼容旧版目标设置，并补齐新版目标天数字段。
 * @param {object} profile 原始用户资料
 * @returns {object} 标准用户资料
 */
function normalizeProfile(profile) {
  const source = profile || {};
  const userInfo = source.userInfo || {};
  const goals = source.goals || {};
  return {
    userInfo: {
      nickname: userInfo.nickname || "",
      avatarUrl: userInfo.avatarUrl || "",
      roleName: userInfo.roleName || "自我管理者",
      height: userInfo.height || "",
      weight: userInfo.weight || "",
      bmi: userInfo.bmi || "",
      birthDate: userInfo.birthDate || "1990-01-01",
      gender: userInfo.gender || "男"
    },
    goals: {
      exercise: {
        targetDays: Number((goals.exercise && goals.exercise.targetDays) || 200),
        weeklyCount: Number((goals.exercise && goals.exercise.weeklyCount) || 5),
        weeklyDuration: Number((goals.exercise && goals.exercise.weeklyDuration) || 300)
      },
      reading: {
        targetDays: Number((goals.reading && goals.reading.targetDays) || 100),
        dailyDuration: Number((goals.reading && goals.reading.dailyDuration) || 60)
      },
      english: {
        targetDays: Number((goals.english && goals.english.targetDays) || (goals.english && goals.english.streakDays) || 100),
        streakDays: Number((goals.english && goals.english.streakDays) || 100)
      },
      sleep: {
        targetDays: Number((goals.sleep && goals.sleep.targetDays) || 100),
        dailyDuration: Number((goals.sleep && goals.sleep.dailyDuration) || 8)
      }
    }
  };
}

/**
 * 保存用户资料。
 * @param {object} profile 用户资料
 */
function saveUserProfile(profile) {
  wx.setStorageSync(PROFILE_KEY, profile);
}

/**
 * 读取应用设置。
 * @returns {object} 应用设置
 */
function getSettings() {
  return wx.getStorageSync(SETTINGS_KEY) || { theme: "light", notifications: true };
}

/**
 * 读取全部身体指标记录。
 * @returns {Array<object>} 身体指标记录
 */
function getBodyMetrics() {
  return getArrayStorage(BODY_METRICS_KEY).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * 读取指定日期的身体指标记录。
 * @param {string} date 日期字符串
 * @returns {object|null} 身体指标
 */
function getBodyMetricByDate(date) {
  return getBodyMetrics().find((record) => record.date === date) || null;
}

/**
 * 保存身体指标，同一天只保留最新一条。
 * @param {object} metric 身体指标
 * @returns {object} 保存后的记录
 */
function saveBodyMetric(metric) {
  const date = metric.date || formatDate();
  const metrics = getBodyMetrics().filter((item) => item.date !== date);
  const normalized = {
    ...metric,
    type: "body",
    date,
    timestamp: metric.timestamp || Date.now(),
    updatedAt: Date.now()
  };
  metrics.push(normalized);
  wx.setStorageSync(BODY_METRICS_KEY, metrics);
  return normalized;
}

module.exports = {
  deleteRecord,
  getAllRecords,
  getRecordByType,
  getRecordsByDate,
  getRecordsByYear,
  getSettings,
  getUserProfile,
  getBodyMetricByDate,
  getBodyMetrics,
  saveBodyMetric,
  saveRecord,
  saveUserProfile
};
