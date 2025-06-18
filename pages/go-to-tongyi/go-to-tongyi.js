// pages/go-to-tongyi/go-to-tongyi.js
Page({
  data: {
    articleUrl: ''
  },
  onLoad(options) {
    // 解码 URL 参数，获取公众号文章链接
    const decodedUrl = decodeURIComponent(options.url);
    this.setData({
      articleUrl: decodedUrl
    });
    // 可以设置页面标题，让用户知道在看什么
    wx.setNavigationBarTitle({
      title: '前往通义听悟' // 或者你公众号的名字
    });
    console.log('WebView will load Gongzhonghao Article:', decodedUrl);
  }
});