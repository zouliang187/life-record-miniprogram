const SHARE_TITLE = "生活记录助手";
const SHARE_PATH = "/pages/index/index";

/**
 * 打开右上角菜单中的转发给朋友和分享到朋友圈入口。
 */
function enableShareMenu() {
  if (!wx.showShareMenu) return;
  wx.showShareMenu({
    withShareTicket: true,
    menus: ["shareAppMessage", "shareTimeline"]
  });
}

/**
 * 生成转发给朋友的分享内容。
 * @returns {object} 分享配置
 */
function getShareAppMessage() {
  return {
    title: "生活记录助手：记录运动、阅读、睡眠和学习",
    path: SHARE_PATH
  };
}

/**
 * 生成分享到朋友圈的分享内容。
 * @returns {object} 朋友圈分享配置
 */
function getShareTimeline() {
  return {
    title: SHARE_TITLE,
    query: "",
    imageUrl: ""
  };
}

module.exports = {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline
};
