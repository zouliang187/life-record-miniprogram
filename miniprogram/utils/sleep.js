function parseHm(text) {
  const [h, m] = String(text || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return h * 60 + m;
}

function calcSleepDuration(sleepTime, wakeTime) {
  const sleepMinutes = parseHm(sleepTime);
  const wakeMinutes = parseHm(wakeTime);
  if (sleepMinutes === null || wakeMinutes === null) {
    return { valid: false, durationMinutes: 0, message: "请输入有效时间" };
  }

  let duration = wakeMinutes - sleepMinutes;
  if (duration < 0) {
    duration += 24 * 60;
  }

  if (duration < 30 || duration > 960) {
    return {
      valid: false,
      durationMinutes: duration,
      message: "睡眠时长需在 30-960 分钟之间"
    };
  }

  return { valid: true, durationMinutes: duration, message: "" };
}

module.exports = {
  calcSleepDuration
};
