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
    tongyiGongzhonghaoArticleUrl: 'https://mp.weixin.qq.com/s/w8O2PB-8hA5u27T7UuX7oQ', // 你的公众号文章链接

    // 修正：简化动画状态变量，只用一个showPasteButton控制
    showPasteButton: true, // 控制粘贴按钮是否显示，默认显示
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.getSafeAreaInfo();
  },

  /**
   * 页面显示/从后台回到前台时
   * 修正：确保按钮显示状态的正确性
   */
  onShow() {
      const shouldBeVisible = !this.data.inputValue.trim() && !this.data.resultUrl;
      this.setData({ showPasteButton: shouldBeVisible });
  },

  /**
   * 监听输入框内容变化
   */
  onInput(e) {
    const value = e.detail.value;
    this.setData({
      inputValue: value,
      // 直接根据inputValue是否为空来控制showPasteButton
      showPasteButton: !value.trim() 
    });
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
   * 粘贴链接按钮点击事件
   */
  onPasteLinkTap() {
    wx.getClipboardData({
      success: (res) => {
        const clipboardData = res.data.trim();
        if (clipboardData) {
          this.setData({
            inputValue: clipboardData, // 将剪贴板内容填充到输入框
            showPasteButton: false // 粘贴后立即隐藏按钮
          }, () => {
            wx.showToast({
              title: '已粘贴', 
              icon: 'none',
              duration: 1000
            });
          });
        } else {
          wx.showToast({
            title: '剪贴板没有内容',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取剪贴板数据失败:', err);
        wx.showToast({
          title: '无法获取剪贴板内容',
          icon: 'none'
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
      statusMessage: '',
      showPasteButton: false, // 开始提取时，隐藏粘贴按钮
    });

    wx.cloud.callFunction({
      name: 'extractM4a',
      data: {
        episodeUrl: this.data.inputValue
      }
    }).then(res => {
      const { success, m4aUrl, title, error } = res.result;

      if (success) {
        this.setData({
          resultUrl: m4aUrl,
          podcastTitle: title || '未知播客标题',
          inputValue: '', 
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
   * 仅复制链接到剪贴板，不进行跳转
   */
  onCopyLinkOnly() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({
            title: '已复制', 
            icon: 'success',
            duration: 1500
          });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showToast({
            title: '复制失败', 
            icon: 'none'
          });
        }
      });
    }
  },

  /**
   * “复制 • 转写”按钮的点击事件处理函数 (复制并前往文章)
   */
  onCopyAndNavigateTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({
            title: '已复制', 
            icon: 'success',
            duration: 1500,
            success: () => {
              wx.navigateTo({
                url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}`
              });
            }
          });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showToast({
            title: '复制失败', 
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
      statusMessage: '',
      showPasteButton: true, // 回到输入界面时，显示粘贴按钮
    });
  }
});