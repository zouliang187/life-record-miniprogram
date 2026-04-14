App({
  /**
   * 小程序启动时初始化本地数据容器。
   */
  onLaunch() {
    const settings = wx.getStorageSync("appSettings");
    if (!settings) {
      wx.setStorageSync("appSettings", {
        theme: "light",
        notifications: true
      });
    }
  },

  globalData: {
    appName: "生活记录助手"
  }
});
