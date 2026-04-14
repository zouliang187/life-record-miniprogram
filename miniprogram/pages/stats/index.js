const { getStats } = require("../../services/dailyRecordService");

Page({
  data: {
    activeRange: "week",
    stats: null,
    loading: false
  },

  onShow() {
    this.loadStats();
  },

  onSwitchRange(e) {
    const range = e.currentTarget.dataset.range;
    if (range === this.data.activeRange) return;
    this.setData({ activeRange: range });
    this.loadStats();
  },

  async loadStats() {
    this.setData({ loading: true });
    try {
      const res = await getStats(this.data.activeRange);
      this.setData({ stats: res.stats || null });
    } catch (err) {
      wx.showToast({ title: "统计加载失败", icon: "none" });
      console.error(err);
    } finally {
      this.setData({ loading: false });
    }
  },

  ratio(done, total) {
    if (!total) return 0;
    return Math.round((done / total) * 100);
  }
});
