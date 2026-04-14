const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const collection = db.collection("daily_records");
const _ = db.command;

function assertDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }
}

function buildDefaultRecord({ _id, openid, date }) {
  return {
    _id,
    userId: openid,
    date,
    reading: null,
    workout: null,
    sleep: null,
    english: null,
    updatedAt: db.serverDate()
  };
}

function getRangeDates(mode, now = new Date()) {
  const format = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (mode === "week") {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (day - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startDate: format(start), endDate: format(end) };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: format(start), endDate: format(end) };
}

function toFixedNumber(value) {
  return Number(value.toFixed(1));
}

async function handleGetDailyRecord(openid, date) {
  assertDate(date);
  const id = `${openid}_${date}`;
  try {
    const res = await collection.doc(id).get();
    return { record: res.data || null };
  } catch (err) {
    if (err.errCode === -1) {
      return { record: null };
    }
    throw err;
  }
}

async function handleSaveDailyRecord(openid, date, partialUpdate) {
  assertDate(date);
  const id = `${openid}_${date}`;

  let existing = null;
  try {
    const res = await collection.doc(id).get();
    existing = res.data;
  } catch (err) {
    if (err.errCode !== -1) {
      throw err;
    }
  }

  const base = existing || buildDefaultRecord({ _id: id, openid, date });
  const merged = {
    ...base,
    ...partialUpdate,
    userId: openid,
    date,
    updatedAt: db.serverDate()
  };

  await collection.doc(id).set({ data: merged });
  return { success: true, recordId: id };
}

async function handleGetStats(openid, range) {
  const mode = range === "month" ? "month" : "week";
  const { startDate, endDate } = getRangeDates(mode);
  const res = await collection
    .where({
      userId: openid,
      date: _.gte(startDate).and(_.lte(endDate))
    })
    .get();

  const rows = res.data || [];
  const periodDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1;
  let readingTotal = 0;
  let readingDays = 0;
  let workoutTotal = 0;
  let workoutDays = 0;
  let sleepTotal = 0;
  let sleepDays = 0;
  let englishDoneDays = 0;

  rows.forEach((item) => {
    if (item.reading && item.reading.minutes) {
      readingTotal += Number(item.reading.minutes) || 0;
      readingDays += 1;
    }
    if (item.workout && item.workout.minutes) {
      workoutTotal += Number(item.workout.minutes) || 0;
      workoutDays += 1;
    }
    if (item.sleep && item.sleep.durationMinutes) {
      sleepTotal += Number(item.sleep.durationMinutes) || 0;
      sleepDays += 1;
    }
    if (item.english && item.english.duolingoChecked) {
      englishDoneDays += 1;
    }
  });

  return {
    stats: {
      range: mode,
      startDate,
      endDate,
      totalDays: periodDays,
      recordDays: rows.length,
      reading: {
        totalMinutes: readingTotal,
        completedDays: readingDays,
        avgMinutesPerCompletedDay: readingDays ? toFixedNumber(readingTotal / readingDays) : 0
      },
      workout: {
        totalMinutes: workoutTotal,
        completedDays: workoutDays,
        avgMinutesPerCompletedDay: workoutDays ? toFixedNumber(workoutTotal / workoutDays) : 0
      },
      sleep: {
        avgDurationMinutes: sleepDays ? toFixedNumber(sleepTotal / sleepDays) : 0,
        recordDays: sleepDays
      },
      english: {
        completedDays: englishDoneDays
      }
    }
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action, date, partialUpdate, range } = event;

  if (!OPENID) {
    throw new Error("Missing openid");
  }

  if (action === "getDailyRecord") {
    return handleGetDailyRecord(OPENID, date);
  }

  if (action === "saveDailyRecord") {
    return handleSaveDailyRecord(OPENID, date, partialUpdate || {});
  }

  if (action === "getStats") {
    return handleGetStats(OPENID, range);
  }

  throw new Error(`Unsupported action: ${action}`);
};

