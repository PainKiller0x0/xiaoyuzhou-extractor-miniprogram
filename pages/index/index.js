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
    // 新增：你的公众号文章链接，包含通义听悟小程序跳转
    tongyiGongzhonghaoArticleUrl: 'https://mp.weixin.qq.com/s/w8O2PB-8hA5u27T7UuX7oQ', 
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.getSafeAreaInfo();
  },

  /**
   * 获取底部安全区域信息 (已修正，使用新版 API)
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
          safeAreaBottom: 10
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
      podcastTitle: '',
      statusMessage: ''
    });

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
   * “复制链接”按钮 和 链接显示区域 的点击事件处理函数
   * 0.2.0 版本核心修改：复制后直接跳转到公众号文章WebView
   */
  onCopyTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success',
            duration: 1500,
            success: () => {
              // 复制成功后，直接跳转到承载公众号文章的WebView页面
              // 将公众号文章链接作为参数传递
              wx.navigateTo({
                url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}`
              });
            }
          });
        },
        fail: (err) => {
            console.error('复制失败:', err);
            wx.showToast({
                title: '复制失败，请重试',
                icon: 'none'
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
      podcastTitle: '',
      isLoading: false,
      statusMessage: ''
    });
  }
});