// pages/index/index.js (最终版本 - 集成新后端功能)
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
    // V0.5.0 新增：用于存储亮点卡片数据
    highlightQuote: '',
    highlightSummary: '',
    highlightTags: [],
    podcastCover: '',
    podcastName: ''
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
      statusMessage: '',
      errorType: '',
    });
  },

  /**
   * 获取底部安全区域信息，并计算页面的底部填充
   */
  getSafeAreaInfo() {
    wx.getSystemInfo({
      success: (res) => {
        const screenWidth = res.screenWidth;
        let safeAreaBottomPx = 0;
        if (res.safeArea && res.safeArea.bottom < res.windowHeight) {
          safeAreaBottomPx = 0;
        } else if (res.safeArea && res.safeArea.bottom > res.windowHeight) {
          safeAreaBottomPx = res.safeArea.bottom - res.windowHeight;
        }
        
        const safeAreaBottomRpx = safeAreaBottomPx * (750 / screenWidth);
        const mainButtonHeight = 108;
        const secondaryAreaHeight = 30 + 40;
        const bottomActionsFixedBasePadding = 20 + 40;
        let maxBottomAreaContentHeight = mainButtonHeight + secondaryAreaHeight; 
        const extraBottomSpacing = 60;
        const calculatedContainerPaddingBottom = maxBottomAreaContentHeight + bottomActionsFixedBasePadding + safeAreaBottomRpx + extraBottomSpacing;

        this.setData({ 
          safeAreaBottom: safeAreaBottomRpx,
          containerPaddingBottom: calculatedContainerPaddingBottom
        });
      },
      fail: (err) => {
        console.error('获取系统信息失败', err);
        this.setData({ 
          safeAreaBottom: 10,
          containerPaddingBottom: 350
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
            statusMessage: '',
            errorType: '',
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

    wx.request({
        url: serverApiUrl,
        method: 'POST',
        data: { episodeUrl: urlToExtract },
        header: {
            'content-type': 'application/json'
        },
        success: (res) => {
            const { success, m4aUrl, title, error, errorCode, cover, shownote, podcastName } = res.data;

            if (success) {
                // 如果成功提取，则继续调用 getHighlights 接口
                this.setData({
                  podcastTitle: title || '未知播客标题',
                  podcastCover: cover || '',
                  podcastName: podcastName || '',
                  // 清除旧的亮点数据
                  highlightQuote: '',
                  highlightSummary: '',
                  highlightTags: []
                });

                if (shownote) {
                    this.getHighlights(title, shownote);
                } else {
                    this.setData({
                        resultUrl: m4aUrl,
                        inputValue: '',
                        statusMessage: '链接提取成功！但无法生成亮点卡片。',
                        errorType: ''
                    });
                    wx.showToast({ title: '提取成功', icon: 'success', duration: 1500 });
                }

            } else {
                console.error(`服务器返回错误: [${errorCode}] ${error}`);
                this.setData({
                    statusMessage: error || '发生未知错误',
                    errorType: errorCode || 'UNKNOWN_ERROR',
                });
                wx.showToast({ title: '提取失败', icon: 'error', duration: 2000 });
                this.setData({ isLoading: false }); // 失败时隐藏 loading
            }
        },
        fail: (err) => {
            console.error('wx.request 请求失败:', err);
            this.setData({
                statusMessage: '服务连接失败，请检查网络或稍后再试。',
                errorType: 'NETWORK_ERROR',
            });
            wx.showToast({ title: '请求失败', icon: 'error', duration: 2000 });
            this.setData({ isLoading: false }); // 失败时隐藏 loading
        },
        complete: () => {
            // 在这里不隐藏 loading，因为要等待 getHighlights 的结果
        }
    });
  },

  /**
   * “获取亮点”的API调用
   * @param {string} title 播客标题
   * @param {string} shownote 播客简介
   */
  getHighlights(title, shownote) {
    const serverApiUrl = 'https://zhaixingyi.painkiller.top/api/getHighlights';

    this.setData({
        statusMessage: '正在分析节目简介，生成亮点...',
    });

    wx.request({
        url: serverApiUrl,
        method: 'POST',
        data: { title, shownote },
        header: {
            'content-type': 'application/json'
        },
        success: (res) => {
            const { success, highlights } = res.data;
            if (success && highlights) {
                this.setData({
                    highlightQuote: highlights.quote || '',
                    highlightSummary: highlights.summary || '',
                    highlightTags: highlights.tags || [],
                    statusMessage: '亮点卡片生成成功！'
                });
            } else {
                console.error('getHighlights 接口调用失败:', res.data.error);
                this.setData({
                    statusMessage: '亮点卡片生成失败，请重试或反馈问题。',
                    errorType: 'GENERATE_FAILED' // 新增错误类型
                });
            }
        },
        fail: (err) => {
            console.error('getHighlights API 请求失败:', err);
            this.setData({
                statusMessage: '亮点卡片 API 服务连接失败，请稍后重试。',
                errorType: 'NETWORK_ERROR'
            });
        },
        complete: () => {
            this.setData({ isLoading: false }); // 所有请求完成后才隐藏 loading
            this.onShow();
        }
    });
  },

  /**
   * “重试”按钮的点击事件
   */
  onRetryTap() {
    this.setData({
      inputValue: this.data.lastInputValue,
      statusMessage: '',
      errorType: '',
    }, () => {
      this.onExtractTap();
    });
  },
  
  /**
   * “反馈问题”的点击事件 (跳转到新的反馈页面)
   */
  onFeedbackTap() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
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
      errorType: '',
      showPasteButton: true,
      highlightQuote: '',
      highlightSummary: '',
      highlightTags: [],
      podcastCover: '',
      podcastName: ''
    });
  },

  /**
   * 新增：用户点击右上角分享给好友/群 (转发)
   */
  onShareAppMessage(res) {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    let sharePath = '/pages/index/index';

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
   */
  onShareTimeline() {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    let query = '';

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