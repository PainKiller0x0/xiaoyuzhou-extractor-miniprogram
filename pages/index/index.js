// pages/index/index.js (最终合并版 v0.3.0 升级完成)
Page({
  /**
   * 页面的初始数据
   */
  data: {
    inputValue: '', // 绑定输入框的内容
    lastInputValue: '', // 新增：用于“重试”功能，记住上一次的输入
    resultUrl: '',
    podcastTitle: '',
    isLoading: false,
    statusMessage: '',
    errorType: '', // V0.3.0 新增：存储云函数返回的错误类型 (INVALID_LINK, PARSE_FAILED, NETWORK_ERROR)
    safeAreaBottom: 0,
    showPasteButton: true, // 你新增的：控制粘贴按钮是否显示
    // showRetry: false, // 移除此变量，WXML中直接通过 errorType 判断是否显示重试按钮
    tongyiGongzhonghaoArticleUrl: 'https://mp.weixin.qq.com/s/w8O2PB-8hA5u27T7UuX7oQ',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.getSafeAreaInfo();
  },

  /**
   * 页面显示/从后台回到前台时
   * (保留你的优秀实现)
   */
  onShow() {
      const shouldBeVisible = !this.data.inputValue.trim() && !this.data.resultUrl && !this.data.isLoading && !this.data.errorType;
      this.setData({ showPasteButton: shouldBeVisible });
  },

  /**
   * 监听输入框内容变化
   * (保留你的优秀实现)
   */
  onInput(e) {
    const value = e.detail.value;
    this.setData({
      inputValue: value,
      showPasteButton: !value.trim(),
      statusMessage: '', // 输入时清除状态信息
      errorType: '',     // 输入时清除错误类型
      // showRetry: false, // 移除，因为showRetry由errorType控制
    });
  },

  /**
   * 获取底部安全区域信息 (保持不变)
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
        this.setData({ safeAreaBottom: safeAreaBottom });
      },
      fail: (err) => {
        console.error('获取窗口信息失败', err);
        this.setData({ safeAreaBottom: 10 });
      }
    });
  },

  /**
   * 粘贴链接按钮点击事件
   * (保留你的优秀实现)
   */
  onPasteLinkTap() {
    wx.getClipboardData({
      success: (res) => {
        const clipboardData = res.data.trim();
        if (clipboardData) {
          this.setData({
            inputValue: clipboardData,
            showPasteButton: false,
            statusMessage: '', // 粘贴时清除状态信息
            errorType: '',     // 粘贴时清除错误类型
            // showRetry: false, // 移除
          }, () => {
            wx.showToast({ title: '已粘贴', icon: 'none', duration: 1000 });
          });
        } else {
          wx.showToast({ title: '剪贴板没有内容', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('获取剪贴板数据失败:', err);
        wx.showToast({ title: '无法获取剪贴板内容', icon: 'none' });
      }
    });
  },

  /**
   * “提取音频”按钮的点击事件处理函数 (已升级)
   */
  onExtractTap() {
    const urlToExtract = this.data.inputValue.trim();
    if (!urlToExtract) {
      this.setData({
        statusMessage: '请输入小宇宙播客单集链接',
        errorType: 'INVALID_LINK' // 没有输入链接，也视为无效链接错误
      });
      return;
    }

    this.setData({
      isLoading: true,
      resultUrl: '',
      podcastTitle: '',
      statusMessage: '正在分析链接，请稍候...', // 提取开始时的提示信息
      errorType: '',     // 开始提取时清除所有错误状态
      // showRetry: false, // 移除
      showPasteButton: false, // 提取时隐藏粘贴按钮
      lastInputValue: urlToExtract, // 记住本次提取的链接，以备重试
    });

    wx.cloud.callFunction({
      name: 'extractM4a',
      data: { episodeUrl: urlToExtract }
    }).then(res => {
      console.log('云函数调用成功:', res);
      // 云函数返回的数据在 res.result 中
      const { success, m4aUrl, title, error, errorCode } = res.result;

      if (success) {
        this.setData({
          resultUrl: m4aUrl,
          podcastTitle: title || '未知播客标题',
          inputValue: '', // 成功后清空输入框
          statusMessage: '链接提取成功！', // 成功提示
          errorType: '', // 成功则清除错误类型
        });
        wx.showToast({ title: '提取成功', icon: 'success', duration: 1500 });
      } else {
        // --- 核心修改：根据 errorCode 显示不同信息和按钮 ---
        console.error(`云函数返回错误: [${errorCode}] ${error}`);
        this.setData({
          statusMessage: error || '发生未知错误', // 显示云函数返回的错误信息
          errorType: errorCode || 'UNKNOWN_ERROR', // 保存错误类型
        });
        wx.showToast({ title: '提取失败', icon: 'error', duration: 2000 });
      }
    }).catch(err => {
      // 云函数调用本身失败，例如网络连接问题，或云函数部署问题
      console.error('云函数调用失败:', err);
      this.setData({
        statusMessage: '服务连接失败，请检查网络或稍后再试。',
        errorType: 'NETWORK_ERROR', // 客户端调用失败也视为网络错误
      });
      wx.showToast({ title: '请求失败', icon: 'error', duration: 2000 });
    }).finally(() => {
      this.setData({
        isLoading: false
      });
      // 在处理完结果或错误后，重新评估粘贴按钮的显示
      this.onShow(); 
    });
  },

  /**
   * --- 新增：“重试”按钮的点击事件 ---
   */
  onRetryTap() {
    this.setData({
      inputValue: this.data.lastInputValue, // 将之前失败的链接填回输入框
      statusMessage: '', // 清除之前的错误提示
      errorType: '',     // 清除之前的错误类型
      // showRetry: false, // 移除
    }, () => {
      this.onExtractTap(); // 再次调用提取函数
    });
  },
  
  /**
   * --- 新增：“反馈问题”的点击事件 (更新为跳转到反馈页面) ---
   */
  onFeedbackTap() {
    wx.navigateTo({
      url: '/pages/feedback/feedback' // 跳转到新的反馈页面
    });
  },

  /**
   * 仅复制链接到剪贴板 (保持不变)
   */
  onCopyLinkOnly() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => { wx.showToast({ title: '已复制', icon: 'success', duration: 1500 }); },
        fail: () => { wx.showToast({ title: '复制失败', icon: 'none' }); }
      });
    }
  },

  /**
   * “复制 • 转写”按钮的点击事件处理函数 (保持不变)
   */
  onCopyAndNavigateTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({ title: '已复制，即将跳转', icon: 'success', duration: 1500 });
          wx.navigateTo({
            url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}`
          });
        },
        fail: () => { wx.showToast({ title: '复制失败', icon: 'none' }); }
      });
    }
  },

  /**
   * “提取新链接”按钮：重置页面状态 (已升级)
   */
  onResetTap() {
    this.setData({
      inputValue: '',
      resultUrl: '',
      podcastTitle: '',
      isLoading: false,
      statusMessage: '',
      errorType: '', // 重置时清除错误类型
      showPasteButton: true, // 回到输入界面时，显示粘贴按钮
      // showRetry: false, // 移除
    });
  }
});