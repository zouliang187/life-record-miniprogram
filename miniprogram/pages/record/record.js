const { formatDate } = require("../../utils/date");
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require("../../utils/share");
const { deleteRecord, getAllRecords, getRecordByType, saveRecord } = require("../../utils/storage");
const {
  calculateModuleStreak,
  calculateSleepDuration,
  estimateCalories
} = require("../../utils/calculator");

const TABS = [
  { type: "exercise", name: "运动" },
  { type: "reading", name: "阅读" },
  { type: "sleep", name: "睡眠" },
  { type: "english", name: "英语" }
];
const PROJECTS = ["", "未运动", "篮球", "跑步", "居家健身", "户外徒步", "游泳", "骑行", "瑜伽", "其他"];
const DURATION_OPTIONS = Array.from({ length: 181 }).map((_, index) => `${index}分钟`);

Page({
  data: {
    activeType: "exercise",
    tabs: TABS,
    date: "",
    projects: PROJECTS,
    projectIndex: 0,
    durationOptions: DURATION_OPTIONS,
    durationIndex: 44,
    exerciseForm: {},
    readingForm: {},
    sleepForm: {},
    englishForm: {},
    stars: [1, 2, 3, 4, 5],
    sleepDurationText: "8.0小时",
    englishTotalDuration: 0
  },

  /**
   * 初始化当天记录表单。
   */
  onLoad() {
    this.setData({ date: formatDate() });
    this.resetForms();
  },

  /**
   * 页面展示时读取首页传入的目标 tab。
   */
  onShow() {
    enableShareMenu();
    const activeType = wx.getStorageSync("recordActiveType");
    if (activeType) {
      wx.removeStorageSync("recordActiveType");
      this.setData({ activeType }, () => this.loadExistingRecord());
      return;
    }
    this.loadExistingRecord();
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
   * 重置四个模块的默认表单。
   */
  resetForms(callback) {
    this.setData({
      exerciseForm: {
        project: "",
        customProject: "",
        duration: 0,
        pushups: "",
        squats: "",
        plank: "",
        hangBar: "",
        pullups: "",
        otherDetail: "",
        note: ""
      },
      readingForm: {
        bookName: "",
        duration: "",
        currentPage: "",
        totalPages: "",
        note: ""
      },
      sleepForm: {
        bedTime: "23:00",
        wakeTime: "07:00",
        watchScore: "",
        quality: 4,
        napEnabled: false,
        napDuration: ""
      },
      englishForm: {
        dailyCompleted: true,
        dailyDuration: 15,
        note: ""
      }
    }, () => {
      this.updateSleepDuration();
      this.updateEnglishTotal();
      if (callback) callback();
    });
  },

  /**
   * 读取当前日期当前模块已有记录并回填表单。
   */
  loadExistingRecord() {
    const record = getRecordByType(this.data.date, this.data.activeType);
    if (!record) return;
    if (record.type === "exercise") this.fillExercise(record);
    if (record.type === "reading") this.fillReading(record);
    if (record.type === "sleep") this.fillSleep(record);
    if (record.type === "english") this.fillEnglish(record);
  },

  /**
   * 切换记录模块。
   * @param {object} e 点击事件
   */
  onTabTap(e) {
    this.setData({ activeType: e.currentTarget.dataset.type }, () => this.loadExistingRecord());
  },

  /**
   * 切换记录日期。
   * @param {object} e picker 事件
   */
  onDateChange(e) {
    this.setData({ date: e.detail.value }, () => {
      this.resetForms(() => this.loadExistingRecord());
    });
  },

  /**
   * 通用输入处理。
   * @param {object} e 输入事件
   */
  onInput(e) {
    const path = e.currentTarget.dataset.path;
    this.setData({ [path]: e.detail.value }, () => {
      if (path.indexOf("sleepForm") === 0) this.updateSleepDuration();
      if (path.indexOf("englishForm") === 0) this.updateEnglishTotal();
    });
  },

  /**
   * 通用开关处理。
   * @param {object} e switch 事件
   */
  onSwitchChange(e) {
    const path = e.currentTarget.dataset.path;
    this.setData({ [path]: e.detail.value }, () => {
      if (path.indexOf("englishForm") === 0) this.updateEnglishTotal();
    });
  },

  /**
   * 切换英语模块 checkbox 状态。
   * @param {object} e 点击事件
   */
  onCheckboxTap(e) {
    const path = e.currentTarget.dataset.path;
    const currentValue = path.split(".").reduce((source, key) => source[key], this.data);
    this.setData({ [path]: !currentValue }, () => this.updateEnglishTotal());
  },

  /**
   * 切换运动项目。
   * @param {object} e picker 事件
   */
  onProjectChange(e) {
    const projectIndex = Number(e.detail.value);
    const project = PROJECTS[projectIndex];
    const isNoExercise = !project || project === "未运动";
    this.setData({
      projectIndex,
      "exerciseForm.project": project,
      "exerciseForm.duration": isNoExercise ? 0 : (this.data.exerciseForm.duration || 30),
      durationIndex: isNoExercise ? 0 : Math.max(0, Number(this.data.exerciseForm.duration || 30))
    });
  },

  /**
   * 通过纵向 picker 调整运动时长。
   * @param {object} e picker 事件
   */
  onDurationChange(e) {
    const durationIndex = Number(e.detail.value);
    this.setData({
      durationIndex,
      "exerciseForm.duration": this.isNoExerciseSelected() ? 0 : durationIndex
    });
  },

  /**
   * 星级评分。
   * @param {object} e 点击事件
   */
  onRateTap(e) {
    this.setData({ "sleepForm.quality": Number(e.currentTarget.dataset.value) });
  },

  /**
   * 更新睡眠时长展示。
   */
  updateSleepDuration() {
    const { bedTime, wakeTime } = this.data.sleepForm;
    const duration = calculateSleepDuration(bedTime, wakeTime);
    this.setData({ sleepDurationText: `${duration}小时` });
  },

  /**
   * 更新英语总学习时长。
   */
  updateEnglishTotal() {
    const form = this.data.englishForm;
    const total = form.dailyCompleted ? Number(form.dailyDuration || 0) : 0;
    this.setData({ englishTotalDuration: total });
  },

  /**
   * 保存当前模块记录。
   */
  onSubmit() {
    const records = this.buildAllRecords();
    if (!records) return;
    if (this.isNoExerciseSelected()) {
      deleteRecord(this.data.date, "exercise");
    }
    records.forEach((record) => saveRecord(record));
    wx.showToast({ title: `已保存${records.length}项`, icon: "success" });
  },

  /**
   * 构造当天所有已填写模块记录。
   * @returns {Array<object>|null} 待保存记录
   */
  buildAllRecords() {
    const records = [];
    const exerciseRecord = this.buildExerciseRecord();
    if (exerciseRecord === false) return null;
    if (exerciseRecord) records.push(exerciseRecord);

    if (this.hasReadingInput()) {
      const readingRecord = this.buildReadingRecord();
      if (!readingRecord) return null;
      records.push(readingRecord);
    }

    const sleepRecord = this.buildSleepRecord();
    if (!sleepRecord) return null;
    records.push(sleepRecord);

    if (this.hasEnglishInput()) {
      records.push(this.buildEnglishRecord());
    }

    return records;
  },

  /**
   * 判断阅读模块是否有填写内容。
   * @returns {boolean} 是否填写
   */
  hasReadingInput() {
    const form = this.data.readingForm;
    return !!(form.bookName || form.duration || form.currentPage || form.totalPages || form.note);
  },

  /**
   * 判断英语模块是否有填写内容。
   * @returns {boolean} 是否填写
   */
  hasEnglishInput() {
    const form = this.data.englishForm;
    return !!(
      form.dailyCompleted ||
      form.dailyDuration ||
      form.note
    );
  },

  /**
   * 构造运动记录。
   * @returns {object|null} 运动记录
   */
  buildExerciseRecord() {
    const form = this.data.exerciseForm;
    const project = form.project === "其他" ? form.customProject.trim() : form.project;
    if (form.project === "其他" && !project) {
      this.showInvalid("请填写运动项目");
      return false;
    }
    if (!project || project === "未运动") return null;
    if (!Number(form.duration)) {
      this.showInvalid("请选择运动时长");
      return false;
    }
    return {
      type: "exercise",
      date: this.data.date,
      timestamp: Date.now(),
      project,
      duration: Number(form.duration || 0),
      details: {
        pushups: Number(form.pushups || 0),
        squats: Number(form.squats || 0),
        plank: Number(form.plank || 0),
        hangBar: Number(form.hangBar || 0),
        pullups: Number(form.pullups || 0),
        other: form.otherDetail || ""
      },
      calories: estimateCalories(project, form.duration),
      note: form.note || ""
    };
  },

  /**
   * 构造阅读记录。
   * @returns {object|null} 阅读记录
   */
  buildReadingRecord() {
    const form = this.data.readingForm;
    if (!form.bookName.trim()) return this.showInvalid("请填写书籍名称");
    if (!Number(form.duration)) return this.showInvalid("请填写阅读时长");
    const totalPages = Number(form.totalPages || 0);
    const currentPage = Number(form.currentPage || 0);
    return {
      type: "reading",
      date: this.data.date,
      timestamp: Date.now(),
      bookName: form.bookName.trim(),
      duration: Number(form.duration),
      currentPage,
      totalPages,
      progress: totalPages ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0,
      note: form.note || ""
    };
  },

  /**
   * 构造睡眠记录。
   * @returns {object} 睡眠记录
   */
  buildSleepRecord() {
    const form = this.data.sleepForm;
    const watchScore = form.watchScore === "" ? "" : Number(form.watchScore);
    if (watchScore !== "" && (watchScore < 0 || watchScore > 100)) {
      return this.showInvalid("睡眠分数需在 0-100 之间");
    }
    return {
      type: "sleep",
      date: this.data.date,
      timestamp: Date.now(),
      bedTime: form.bedTime,
      wakeTime: form.wakeTime,
      duration: calculateSleepDuration(form.bedTime, form.wakeTime),
      watchScore,
      quality: Number(form.quality),
      nap: {
        enabled: !!form.napEnabled,
        duration: form.napEnabled ? Number(form.napDuration || 0) : 0
      }
    };
  },

  /**
   * 构造英语学习记录。
   * @returns {object} 英语记录
   */
  buildEnglishRecord() {
    const form = this.data.englishForm;
    const modules = {
      daily: { completed: !!form.dailyCompleted, duration: form.dailyCompleted ? Number(form.dailyDuration || 0) : 0 }
    };
    const completedModuleCount = Object.keys(modules).filter((key) => modules[key].completed).length;
    const draftRecord = {
      type: "english",
      date: this.data.date
    };
    return {
      type: "english",
      date: this.data.date,
      timestamp: Date.now(),
      modules,
      completedModuleCount,
      totalDuration: this.data.englishTotalDuration,
      streak: calculateModuleStreak(getAllRecords().concat([draftRecord]), "english", this.data.date),
      note: form.note || ""
    };
  },

  /**
   * 回填运动表单。
   * @param {object} record 运动记录
   */
  fillExercise(record) {
    const projectIndex = PROJECTS.indexOf(record.project);
    this.setData({
      projectIndex: projectIndex === -1 ? PROJECTS.length - 1 : projectIndex,
      exerciseForm: {
        project: projectIndex === -1 ? "其他" : record.project,
        customProject: projectIndex === -1 ? record.project : "",
        duration: record.duration,
        pushups: record.details ? record.details.pushups : "",
        squats: record.details ? record.details.squats : "",
        plank: record.details ? record.details.plank : "",
        hangBar: record.details ? record.details.hangBar : "",
        pullups: record.details ? record.details.pullups : "",
        otherDetail: record.details ? record.details.other : "",
        note: record.note || ""
      }
    });
    this.setData({ durationIndex: Math.max(0, Number(record.duration || 0)) });
  },

  /**
   * 判断当前运动选择是否代表未运动。
   * @returns {boolean} 是否未运动
   */
  isNoExerciseSelected() {
    const project = this.data.exerciseForm.project;
    return !project || project === "未运动";
  },

  /**
   * 回填阅读表单。
   * @param {object} record 阅读记录
   */
  fillReading(record) {
    this.setData({
      readingForm: {
        bookName: record.bookName || "",
        duration: record.duration || "",
        currentPage: record.currentPage || "",
        totalPages: record.totalPages || "",
        note: record.note || ""
      }
    });
  },

  /**
   * 回填睡眠表单。
   * @param {object} record 睡眠记录
   */
  fillSleep(record) {
    this.setData({
      sleepForm: {
        bedTime: record.bedTime,
        wakeTime: record.wakeTime,
        watchScore: record.watchScore || "",
        quality: record.quality,
        napEnabled: record.nap ? record.nap.enabled : false,
        napDuration: record.nap ? record.nap.duration : ""
      }
    });
    this.updateSleepDuration();
  },

  /**
   * 回填英语表单。
   * @param {object} record 英语记录
   */
  fillEnglish(record) {
    const modules = record.modules || {};
    this.setData({
      englishForm: {
        dailyCompleted: !!(modules.daily && modules.daily.completed),
        dailyDuration: modules.daily ? modules.daily.duration : "",
        note: record.note || ""
      }
    });
    this.updateEnglishTotal();
  },

  /**
   * 表单校验失败提示。
   * @param {string} title 提示文案
   * @returns {null} 固定返回空
   */
  showInvalid(title) {
    wx.showToast({ title, icon: "none" });
    return null;
  }
});
