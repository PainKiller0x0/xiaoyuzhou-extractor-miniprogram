// pages/index/index.js (迁移至自有服务器版)
Page({
  /**
   * 页面的初始数据
   */
  data: {
    inputValue: '', // 绑定输入框的内容
    lastInputValue: '', // 用于“重试”功能，记住上一次的输入
    resultUrl: '',
    podcastTitle: '',
    isLoading: false,
    statusMessage: '',
    errorType: '', // 存储云函数返回的错误类型 (INVALID_LINK, PARSE_FAILED, NETWORK_ERROR)
    safeAreaBottom: 0, // 底部安全区高度 (rpx单位)
    containerPaddingBottom: 0, // 动态计算页面的底部填充 (rpx单位)
    showPasteButton: true, // 控制粘贴按钮是否显示
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
   */
  onShow() {
      // 只有在非加载、无结果、无输入内容且无错误时显示粘贴按钮
      const shouldBeVisible = !this.data.isLoading && !this.data.resultUrl && !this.data.inputValue.trim() && !this.data.errorType;
      this.setData({ showPasteButton: shouldBeVisible });
  },

  /**
   * 监听输入框内容变化
   */
  onInput(e) {
    const value = e.detail.value;
    this.setData({
      inputValue: value,
      showPasteButton: !value.trim(),
      statusMessage: '', // 输入时清除状态信息
      errorType: '',     // 输入时清除错误类型
    });
  },

  /**
   * 获取底部安全区域信息，并计算页面的底部填充
   */
  getSafeAreaInfo() {
    wx.getSystemInfo({ // 使用 getSystemInfo 更通用且包含 windowInfo
      success: (res) => {
        const screenWidth = res.screenWidth;
        let safeAreaBottomPx = 0;
        // 如果 safeArea.bottom 小于 windowHeight，说明没有底部安全区或安全区很小
        if (res.safeArea && res.safeArea.bottom < res.windowHeight) {
          safeAreaBottomPx = 0; // 此时安全区为0，或者已经包含在windowHeight内
        } else if (res.safeArea && res.safeArea.bottom > res.windowHeight) {
          safeAreaBottomPx = res.safeArea.bottom - res.windowHeight;
        }
        
        // 将px单位的安全区高度转换为rpx
        const safeAreaBottomRpx = safeAreaBottomPx * (750 / screenWidth);

        // 计算底部固定区域的总高度 (单位rpx)
        const mainButtonHeight = 108; // 主按钮固定高度
        const secondaryAreaHeight = 30 + 40; // secondary-action-area 的 margin-top + secondary-button 高度
        const bottomActionsFixedBasePadding = 20 + 40; // bottom-actions-fixed 的 padding-top + 内联 padding-bottom 的固定部分

        // 底部固定区域的最大内容高度（主按钮和次要按钮都显示时）
        let maxBottomAreaContentHeight = mainButtonHeight + secondaryAreaHeight; 
        
        // 最终容器底部填充 = 最大内容高度 + bottomActionsFixedBasePadding + safeAreaBottomRpx + 额外间距
        const extraBottomSpacing = 60; // 额外增加一些间距，防止刚好贴边

        const calculatedContainerPaddingBottom = maxBottomAreaContentHeight + bottomActionsFixedBasePadding + safeAreaBottomRpx + extraBottomSpacing;

        this.setData({ 
          safeAreaBottom: safeAreaBottomRpx, // 存储rpx单位的安全区高度
          containerPaddingBottom: calculatedContainerPaddingBottom // 更新页面的底部填充
        });
      },
      fail: (err) => {
        console.error('获取系统信息失败', err);
        // 失败时的默认值，一个较大的值确保内容不被遮挡
        this.setData({ 
          safeAreaBottom: 10, // 默认10rpx
          containerPaddingBottom: 350 // 较大的默认值
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
            inputValue: clipboardData,
            showPasteButton: false,
            statusMessage: '', // 粘贴时清除状态信息
            errorType: '',     // 粘贴时清除错误类型
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
   * “提取音频”按钮的点击事件处理函数
   */
  onExtractTap() {
    const urlToExtract = this.data.inputValue.trim();
    if (!urlToExtract) {
      this.setData({
        statusMessage: '请输入小宇宙播客单集链接',
        errorType: 'INVALID_LINK'
      });
      return;
    }

    this.setData({
      isLoading: true,
      resultUrl: '',
      podcastTitle: '',
      statusMessage: '正在分析链接，请稍候...',
      errorType: '',
      showPasteButton: false,
      lastInputValue: urlToExtract,
    });
    
    // 自有服务器 API 地址
    const serverApiUrl = 'https://zhaixingyi.painkiller.top/api/extractM4a';

    // 使用 wx.request 调用你的自有服务器
    wx.request({
        url: serverApiUrl,
        method: 'POST',
        data: { episodeUrl: urlToExtract },
        header: {
            'content-type': 'application/json'
        },
        success: (res) => {
            console.log('服务器请求成功:', res.data);
            const { success, m4aUrl, title, error, errorCode } = res.data;

            if (success) {
                this.setData({
                    resultUrl: m4aUrl,
                    podcastTitle: title || '未知播客标题',
                    inputValue: '',
                    statusMessage: '链接提取成功！',
                    errorType: '',
                });
                wx.showToast({ title: '提取成功', icon: 'success', duration: 1500 });
            } else {
                console.error(`服务器返回错误: [${errorCode}] ${error}`);
                this.setData({
                    statusMessage: error || '发生未知错误',
                    errorType: errorCode || 'UNKNOWN_ERROR',
                });
                wx.showToast({ title: '提取失败', icon: 'error', duration: 2000 });
            }
        },
        fail: (err) => {
            console.error('wx.request 请求失败:', err);
            this.setData({
                statusMessage: '服务连接失败，请检查网络或稍后再试。',
                errorType: 'NETWORK_ERROR',
            });
            wx.showToast({ title: '请求失败', icon: 'error', duration: 2000 });
        },
        complete: () => {
            this.setData({ isLoading: false });
            this.onShow();
        }
    });
  },

  /**
   * “重试”按钮的点击事件
   */
  onRetryTap() {
    this.setData({
      inputValue: this.data.lastInputValue, // 将之前失败的链接填回输入框
      statusMessage: '', // 清除之前的错误提示
      errorType: '',     // 清除之前的错误类型
    }, () => {
      this.onExtractTap(); // 再次调用提取函数
    });
  },
  
  /**
   * “反馈问题”的点击事件 (跳转到新的反馈页面)
   */
  onFeedbackTap() {
    wx.navigateTo({
      url: '/pages/feedback/feedback' // 跳转到新的反馈页面
    });
  },

  /**
   * 仅复制链接到剪贴板
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
   * “复制 • 转写”按钮的点击事件处理函数
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
   * “提取新链接”按钮：重置页面状态
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
    });
  },

  /**
   * 新增：用户点击右上角分享给好友/群 (转发)
   * 或点击 <button open-type="share"> 时触发
   * @param {Object} res 转发事件来源
   */
  onShareAppMessage(res) {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    let sharePath = '/pages/index/index'; // 默认分享到首页

    // 如果当前有成功提取的链接和标题，则分享具体内容
    if (this.data.resultUrl && this.data.podcastTitle) {
      shareTitle = `【${this.data.podcastTitle}】音频直链已提取，快来听！ - 摘星译`;
    }

    console.log('[分享] onShareAppMessage 触发', shareTitle, sharePath);

    return {
      title: shareTitle,
      path: sharePath,
    };
  },

  /**
   * 新增：用户点击右上角分享到朋友圈
   * 基础库 2.7.3 及以上版本支持
   */
  onShareTimeline() {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    let query = ''; // 传递给朋友圈的查询参数

    // 如果当前有成功提取的链接和标题，则分享具体内容
    if (this.data.resultUrl && this.data.podcastTitle) {
      shareTitle = `【${this.data.podcastTitle}】音频直链已提取，快来听！ - 摘星译`;
    }

    console.log('[分享] onShareTimeline 触发', shareTitle, query);

    return {
      title: shareTitle,
      query: query,
    };
  },
});