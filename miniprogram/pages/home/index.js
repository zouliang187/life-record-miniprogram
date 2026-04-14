const { formatDate, addDays, getDisplayDate } = require("../../utils/date");
const { calcSleepDuration } = require("../../utils/sleep");
const { getDailyRecord, saveDailyRecord } = require("../../services/dailyRecordService");

const READING_MINUTES = [1, 10, 15, 20, 30, 45, 60];
const WORKOUT_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const ENGLISH_MINUTES = [5, 10, 15, 20, 30];
const WORKOUT_TYPES = ["篮球", "足球", "羽毛球", "健身", "俯卧撑", "跳绳", "跑步", "骑行", "游泳", "瑜伽", "其他"];

function getDefaultRecord(date) {
  return {
    _id: "",
    date,
    userId: "",
    reading: null,
    workout: null,
    sleep: null,
    english: null,
    updatedAt: ""
  };
}

function formatMinutes(mins) {
  if (!mins) return "0 分钟";
  return `${mins} 分钟`;
}

Page({
  data: {
    date: "",
    displayDate: "",
    dailyRecord: null,
    cards: [],
    showSheet: false,
    currentModule: "",
    readingMinutesOpts: READING_MINUTES,
    workoutMinutesOpts: WORKOUT_MINUTES,
    englishMinutesOpts: ENGLISH_MINUTES,
    workoutTypes: WORKOUT_TYPES,
    form: {}
  },

  onLoad() {
    const today = formatDate(new Date());
    this.setData({
      date: today,
      displayDate: getDisplayDate(today)
    });
    this.refreshRecord();
  },

  async refreshRecord() {
    wx.showLoading({ title: "加载中" });
    try {
      const { date } = this.data;
      const res = await getDailyRecord(date);
      const dailyRecord = res.record || getDefaultRecord(date);
      this.setData({
        dailyRecord,
        cards: this.buildCards(dailyRecord)
      });
    } catch (err) {
      wx.showToast({ title: "加载失败", icon: "none" });
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  buildCards(record) {
    const readingDone = !!(record.reading && record.reading.minutes);
    const workoutDone = !!(record.workout && record.workout.minutes);
    const sleepDone = !!(record.sleep && record.sleep.durationMinutes);
    const englishDone = !!(record.english && record.english.duolingoChecked);

    return [
      {
        keyName: "reading",
        title: "阅读",
        completed: readingDone,
        summary: readingDone
          ? `${formatMinutes(record.reading.minutes)} ${record.reading.book || ""}`
          : "未打卡"
      },
      {
        keyName: "workout",
        title: "运动",
        completed: workoutDone,
        summary: workoutDone
          ? `${record.workout.type || "运动"} ${formatMinutes(record.workout.minutes)}`
          : "未打卡"
      },
      {
        keyName: "sleep",
        title: "睡眠",
        completed: sleepDone,
        summary: sleepDone
          ? `${record.sleep.sleepTime}-${record.sleep.wakeTime} ${formatMinutes(record.sleep.durationMinutes)}`
          : "未打卡"
      },
      {
        keyName: "english",
        title: "英语",
        completed: englishDone,
        summary: record.english
          ? `学习:${record.english.duolingoStudied ? "是" : "否"} 校验:${record.english.duolingoChecked ? "是" : "否"}`
          : "未打卡"
      }
    ];
  },

  onDateChange(e) {
    const date = e.detail.value;
    this.setData({
      date,
      displayDate: getDisplayDate(date)
    });
    this.refreshRecord();
  },

  onDateShift(e) {
    const offset = Number(e.currentTarget.dataset.offset || 0);
    const nextDate = addDays(this.data.date, offset);
    this.setData({
      date: nextDate,
      displayDate: getDisplayDate(nextDate)
    });
    this.refreshRecord();
  },

  onEditModule(e) {
    const module = e.detail.module;
    const form = this.buildFormByModule(module);
    this.setData({
      currentModule: module,
      form,
      showSheet: true
    });
  },

  buildFormByModule(module) {
    const { dailyRecord } = this.data;
    const source = dailyRecord && dailyRecord[module] ? dailyRecord[module] : null;

    if (module === "reading") {
      return {
        minutes: source ? source.minutes : "",
        book: source ? source.book : "",
        note: source ? source.note || "" : ""
      };
    }

    if (module === "workout") {
      return {
        type: source ? source.type : "篮球",
        otherType: source && !WORKOUT_TYPES.includes(source.type) ? source.type : "",
        minutes: source ? source.minutes : "",
        note: source ? source.note || "" : ""
      };
    }

    if (module === "sleep") {
      return {
        sleepTime: source ? source.sleepTime : "23:00",
        wakeTime: source ? source.wakeTime : "07:00",
        durationMinutes: source ? source.durationMinutes : 480
      };
    }

    return {
      duolingoStudied: source ? !!source.duolingoStudied : true,
      duolingoChecked: source ? !!source.duolingoChecked : false,
      minutes: source && source.minutes ? source.minutes : "",
      note: source ? source.note || "" : ""
    };
  },

  closeSheet() {
    this.setData({ showSheet: false });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
  },

  onSwitchChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = !!e.detail.value;
    this.setData({ [`form.${field}`]: value });

    if (field === "duolingoStudied" && !value) {
      this.setData({ "form.duolingoChecked": false });
    }
  },

  onQuickMinutes(e) {
    const value = Number(e.currentTarget.dataset.value);
    this.setData({ "form.minutes": value });
  },

  onWorkoutTypeChange(e) {
    const index = Number(e.detail.value);
    const type = WORKOUT_TYPES[index] || WORKOUT_TYPES[0];
    this.setData({ "form.type": type });
  },

  async onSubmit() {
    const { currentModule, form, date } = this.data;
    const partial = {};

    if (currentModule === "reading") {
      const minutes = Number(form.minutes);
      if (!minutes || minutes < 1 || minutes > 600) {
        return wx.showToast({ title: "阅读时长需在 1-600 分钟", icon: "none" });
      }
      if (!form.book || !form.book.trim()) {
        return wx.showToast({ title: "请填写书名", icon: "none" });
      }
      partial.reading = {
        minutes,
        book: form.book.trim(),
        note: (form.note || "").trim()
      };
    }

    if (currentModule === "workout") {
      const minutes = Number(form.minutes);
      const isOther = form.type === "其他";
      const finalType = isOther ? (form.otherType || "").trim() : form.type;

      if (!finalType) {
        return wx.showToast({ title: "请填写运动类型", icon: "none" });
      }
      if (!minutes || minutes < 1 || minutes > 600) {
        return wx.showToast({ title: "运动时长需在 1-600 分钟", icon: "none" });
      }

      partial.workout = {
        type: finalType,
        minutes,
        note: (form.note || "").trim()
      };
    }

    if (currentModule === "sleep") {
      const calc = calcSleepDuration(form.sleepTime, form.wakeTime);
      if (!calc.valid) {
        return wx.showToast({ title: calc.message, icon: "none" });
      }
      partial.sleep = {
        sleepTime: form.sleepTime,
        wakeTime: form.wakeTime,
        durationMinutes: calc.durationMinutes
      };
    }

    if (currentModule === "english") {
      let minutes = "";
      if (form.minutes !== "" && form.minutes !== undefined) {
        minutes = Number(form.minutes);
        if (Number.isNaN(minutes) || minutes < 1 || minutes > 600) {
          return wx.showToast({ title: "英语时长需在 1-600 分钟", icon: "none" });
        }
      }

      partial.english = {
        duolingoStudied: !!form.duolingoStudied,
        duolingoChecked: !!form.duolingoStudied && !!form.duolingoChecked,
        minutes: minutes || 0,
        note: (form.note || "").trim()
      };
    }

    wx.showLoading({ title: "保存中" });
    try {
      await saveDailyRecord(date, partial);
      wx.showToast({ title: "保存成功", icon: "success" });
      this.setData({ showSheet: false });
      this.refreshRecord();
    } catch (err) {
      wx.showToast({ title: "保存失败", icon: "none" });
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  }
});

