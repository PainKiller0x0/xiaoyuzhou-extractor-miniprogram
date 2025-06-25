// pages/index/index.js (最终合并版 v0.4.0 - 新增分享功能)
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
        // bottom-actions-fixed 的 padding-top: 20rpx
        // 主按钮高度: 108rpx
        // secondary-action-area (提取新链接) 的 margin-top: 30rpx
        // secondary-button 的高度: 40rpx

        // 在这个版本中，错误按钮区域(error-action-area)不在底部，而是包含在 status-message-box 里面，
        // 不影响底部的总高度计算。
        // 所以我们只考虑主按钮和次要按钮区域可能的最大高度。
        
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
        // 根据 errorCode 显示不同信息和按钮
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
      // 这里可以根据需求是否带上结果参数，但通常分享出去让用户进入小程序再看结果，路径简单为好
      // sharePath = `/pages/index/index?audioUrl=${encodeURIComponent(this.data.resultUrl)}&title=${encodeURIComponent(this.data.podcastTitle)}`;
    }

    console.log('[分享] onShareAppMessage 触发', shareTitle, sharePath);

    return {
      title: shareTitle,
      path: sharePath,
      // imageUrl: '/images/share_app_message_default.png' // 可选：自定义分享图片，推荐
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
      // query = `audioUrl=${encodeURIComponent(this.data.resultUrl)}&title=${encodeURIComponent(this.data.podcastTitle)}`;
    }

    console.log('[分享] onShareTimeline 触发', shareTitle, query);

    return {
      title: shareTitle,
      query: query,
      // imageUrl: '/images/share_timeline_default.png' // 可选：自定义朋友圈分享图片，推荐 800x640 比例
    };
  },

});