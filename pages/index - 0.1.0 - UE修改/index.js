// pages/index/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    inputValue: '', // 绑定输入框的内容
    resultUrl: '', // 用于存储提取到的音频链接
    podcastTitle: '', // 新增：用于存储提取到的播客标题
    isLoading: false, // 控制“提取”按钮是否显示加载中状态
    statusMessage: '', // 用于显示错误或状态提示信息
    safeAreaBottom: 0, // 底部安全区域高度
  },

  /**
   * 生命周期函数--监听页面加载
   * 在这里获取系统信息，包括安全区域
   */
  onLoad() {
    this.getSafeAreaInfo();
  },

  /**
   * 获取底部安全区域信息
   */
  getSafeAreaInfo() {
    wx.getSystemInfo({
      success: (res) => {
        let safeAreaBottom = 0;
        if (res.safeArea && res.screenHeight > res.safeArea.bottom) {
          safeAreaBottom = res.screenHeight - res.safeArea.bottom;
        }
        // 如果底部安全区小于某个最小值，给一个默认值（例如 20rpx 的 px 值）
        if (safeAreaBottom < wx.rpx2px(20)) { // 假设至少留 20rpx 的间距
            safeAreaBottom = wx.rpx2px(20);
        }

        this.setData({
          safeAreaBottom: safeAreaBottom
        });

        console.log('Safe Area Info:', res.safeArea);
        console.log('Calculated safeAreaBottom (px):', safeAreaBottom);
      },
      fail: (err) => {
        console.error('获取系统信息失败', err);
        this.setData({
          safeAreaBottom: wx.rpx2px(20) // 默认值
        });
      }
    });
  },

  /**
   * “提取音频”按钮的点击事件处理函数
   */
  onExtractTap() {
    if (!this.data.inputValue.trim()) {
      wx.showToast({
        title: '链接不能为空',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isLoading: true,
      resultUrl: '',
      podcastTitle: '', // 清空上一次的标题
      statusMessage: ''
    });

    wx.cloud.callFunction({
      name: 'extractM4a',
      data: {
        episodeUrl: this.data.inputValue
      }
    }).then(res => {
      console.log('云函数调用成功:', res);
      const { success, m4aUrl, title, error } = res.result; // 新增解构 title

      if (success) {
        this.setData({
          resultUrl: m4aUrl,
          podcastTitle: title || '未知播客标题', // 更新标题，如果云函数没返回则显示默认
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
   * “复制链接”按钮 和 链接显示区域 的点击事件处理函数
   */
  onCopyTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success',
            duration: 1500
          });
        }
      });
    }
  },

  /**
   * 重新提取：重置页面状态，回到输入界面
   */
  onResetTap() {
    this.setData({
      inputValue: '',
      resultUrl: '',
      podcastTitle: '', // 清空标题
      isLoading: false,
      statusMessage: ''
    });
  }
});