// pages/index/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    inputValue: '', // 绑定输入框的内容
    resultUrl: '', // 用于存储提取到的音频链接
    podcastTitle: '', // 用于存储提取到的播客标题
    isLoading: false, // 控制“提取”按钮是否显示加载中状态
    statusMessage: '', // 用于显示错误或状态提示信息
    safeAreaBottom: 0, // 底部安全区域高度
    // 你的公众号文章链接，包含通义听悟小程序跳转
    tongyiGongzhonghaoArticleUrl: 'https://mp.weixin.qq.com/s/w8O2PB-8hA5u27T7UuX7oQ',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.getSafeAreaInfo();
  },

  /**
   * 获取底部安全区域信息
   */
  getSafeAreaInfo() {
    wx.getWindowInfo({
      success: (res) => {
        const screenWidth = res.screenWidth;
        const minPaddingPx = 20 * (screenWidth / 750);
        let safeAreaBottom = 0;
        if (res.safeArea && res.screenHeight > res.safeArea.bottom) {
          safeAreaBottom = res.screenHeight - res.safeArea.bottom;
        }
        if (safeAreaBottom < minPaddingPx) {
          safeAreaBottom = minPaddingPx;
        }
        this.setData({
          safeAreaBottom: safeAreaBottom
        });
        console.log('Window Info:', res);
        console.log('Calculated safeAreaBottom (px):', safeAreaBottom);
      },
      fail: (err) => {
        console.error('获取窗口信息失败', err);
        this.setData({
          safeAreaBottom: 10 // 默认值
        });
      }
    });
  },

  /**
   * “提取音频”按钮的点击事件处理函数
   */
  onExtractTap() {
    if (!this.data.inputValue.trim()) {
      wx.showToast({ title: '链接不能为空', icon: 'none' });
      return;
    }
    this.setData({ isLoading: true, resultUrl: '', podcastTitle: '', statusMessage: '' });

    wx.cloud.callFunction({
      name: 'extractM4a',
      data: {
        episodeUrl: this.data.inputValue
      }
    }).then(res => {
      console.log('云函数调用成功:', res);
      const { success, m4aUrl, title, error } = res.result;
      if (success) {
        this.setData({
          resultUrl: m4aUrl,
          podcastTitle: title || '未知播客标题',
          inputValue: ''
        });
      } else {
        this.setData({
          statusMessage: error || '发生未知错误'
        });
      }
    }).catch(err => {
      console.error('云函数调用失败:', err);
      this.setData({
        statusMessage: '服务调用失败，请检查网络或稍后再试'
      });
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },

  /**
   * 【已修正函数名】仅复制链接到剪贴板 (提供给链接区域点击)
   */
  onCopyLinkOnly() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({ title: '已复制到剪贴板', icon: 'success', duration: 1500 });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showToast({ title: '复制失败，请重试', icon: 'none' });
        }
      });
    }
  },

  /**
   * “复制 • 转写”按钮的点击事件处理函数
   */
  onCopyAndNavigateTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          // 【优化点】复制成功后，同时进行提示和跳转，无需嵌套
          wx.showToast({
            title: '已复制，即将跳转', // 提示文字可以优化
            icon: 'success',
            duration: 1500
          });
          // 直接进行跳转
          wx.navigateTo({
            url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}`
          });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showToast({ title: '复制失败，请重试', icon: 'none' });
        }
      });
    }
  },

  /**
   * “提取新链接”按钮：重置页面状态
   */
  onResetTap() {
    this.setData({
      inputValue: '',
      resultUrl: '',
      podcastTitle: '',
      isLoading: false,
      statusMessage: ''
    });
  }
});