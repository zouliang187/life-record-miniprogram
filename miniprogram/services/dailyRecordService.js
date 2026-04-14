function callDailyRecord(action, payload = {}) {
  return wx.cloud.callFunction({
    name: "dailyRecord",
    data: {
      action,
      ...payload
    }
  });
}

async function getDailyRecord(date) {
  const res = await callDailyRecord("getDailyRecord", { date });
  return res.result;
}

async function saveDailyRecord(date, partialUpdate) {
  const res = await callDailyRecord("saveDailyRecord", { date, partialUpdate });
  return res.result;
}

async function getStats(range) {
  const res = await callDailyRecord("getStats", { range });
  return res.result;
}

module.exports = {
  getDailyRecord,
  saveDailyRecord,
  getStats
};
