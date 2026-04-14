const { getAllRecords, getUserProfile, saveUserProfile } = require("../../utils/storage");
const { calculateBmi, formatDataForAI, getAIAdvice } = require("../../utils/calculator");

const GENDERS = ["男", "女", "其他"];
const GOAL_META = [
  { type: "exercise", title: "运动", color: "#ff6b6b", path: "profile.goals.exercise.targetDays" },
  { type: "reading", title: "阅读", color: "#4ecdc4", path: "profile.goals.reading.targetDays" },
  { type: "english", title: "英语", color: "#ffd93d", path: "profile.goals.english.targetDays" },
  { type: "sleep", title: "睡眠", color: "#95e1d3", path: "profile.goals.sleep.targetDays" }
];

Page({
  data: {
    genders: GENDERS,
    genderIndex: 0,
    profile: {},
    bmiInfo: {
      text: "待计算",
      className: "unknown",
      rangeText: "国际标准 18-24"
    },
    goalCards: [],
    exportPreview: ""
  },

  /**
   * 页面加载时读取本地用户资料。
   */
  onLoad() {
    this.loadProfile();
  },

  /**
   * 从本地存储读取资料并设置性别索引。
   */
  loadProfile() {
    const profile = getUserProfile();
    const genderIndex = Math.max(0, GENDERS.indexOf(profile.userInfo.gender));
    this.setData({ profile, genderIndex }, () => {
      this.updateBmi();
      this.updateGoalCards();
    });
  },

  /**
   * 通用输入处理。
   * @param {object} e 输入事件
   */
  onInput(e) {
    const path = e.currentTarget.dataset.path;
    this.setData({ [path]: e.detail.value }, () => {
      this.updateBmi();
      this.updateGoalCards();
    });
  },

  /**
   * 切换性别。
   * @param {object} e picker 事件
   */
  onGenderChange(e) {
    const genderIndex = Number(e.detail.value);
    this.setData({
      genderIndex,
      "profile.userInfo.gender": GENDERS[genderIndex]
    }, () => {
      this.updateBmi();
    });
  },

  /**
   * 选择头像图片并保存临时路径。
   */
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file) {
          this.setData({ "profile.userInfo.avatarUrl": file.tempFilePath });
        }
      }
    });
  },

  /**
   * 根据身高体重自动计算 BMI。
   */
  updateBmi() {
    const userInfo = this.data.profile.userInfo || {};
    const bmi = calculateBmi(userInfo.height, userInfo.weight);
    this.setData({
      "profile.userInfo.bmi": bmi,
      bmiInfo: this.getBmiInfo(bmi, userInfo.gender)
    });
  },

  /**
   * 根据 BMI 数值生成健康状态展示。
   * @param {string|number} bmi BMI 数值
   * @param {string} gender 性别
   * @returns {object} BMI 展示信息
   */
  getBmiInfo(bmi, gender) {
    const value = Number(bmi);
    const rangeText = `${gender || "通用"}标准 18-24`;
    if (!value) {
      return { text: "待计算", className: "unknown", rangeText };
    }
    if (value < 18) {
      return { text: "偏瘦", className: "thin", rangeText };
    }
    if (value < 24) {
      return { text: "正常", className: "normal", rangeText };
    }
    return { text: "偏胖", className: "fat", rangeText };
  },

  /**
   * 汇总四类目标卡片进度。
   */
  updateGoalCards() {
    const records = getAllRecords();
    const goals = this.data.profile.goals || {};
    const goalCards = GOAL_META.map((item) => {
      const moduleGoal = goals[item.type] || {};
      const targetDays = Math.max(1, Number(moduleGoal.targetDays || 1));
      const completedDays = this.countCompletedDays(records, item.type);
      return {
        ...item,
        targetDays,
        completedDays,
        percent: Math.min(100, Math.round((completedDays / targetDays) * 100))
      };
    });
    this.setData({ goalCards });
  },

  /**
   * 统计指定模块已打卡的唯一日期数。
   * @param {Array<object>} records 记录数组
   * @param {string} type 模块类型
   * @returns {number} 已完成天数
   */
  countCompletedDays(records, type) {
    const dates = {};
    records
      .filter((record) => record.type === type)
      .forEach((record) => {
        dates[record.date] = true;
      });
    return Object.keys(dates).length;
  },

  /**
   * 保存个人资料和目标设置。
   */
  onSave() {
    const profile = this.data.profile;
    profile.userInfo.bmi = calculateBmi(profile.userInfo.height, profile.userInfo.weight);
    saveUserProfile(profile);
    wx.showToast({ title: "保存成功", icon: "success" });
  },

  /**
   * 导出本地数据到剪贴板。
   */
  onExport() {
    const payload = {
      profile: this.data.profile,
      records: getAllRecords(),
      exportedAt: new Date().toLocaleString()
    };
    const text = JSON.stringify(payload, null, 2);
    wx.setClipboardData({
      data: text,
      success: () => {
        this.setData({ exportPreview: text.slice(0, 260) });
        wx.showToast({ title: "已复制到剪贴板", icon: "success" });
      }
    });
  },

  /**
   * 预留 AI 建议能力入口，目前仅验证数据格式。
   */
  async onAIAdvice() {
    const data = formatDataForAI(getAllRecords(), this.data.profile.userInfo);
    const result = await getAIAdvice(data);
    wx.showModal({
      title: "AI接口预留",
      content: `${result.message}\n已准备 ${data.records.length} 条记录用于后续分析。`,
      showCancel: false
    });
  }
});
