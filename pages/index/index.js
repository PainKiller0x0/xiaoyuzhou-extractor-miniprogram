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
    podcastName: '',
    historyList: []// 👈 新增：用于存储本地历史记录
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
      // 👈 新增：每次回到页面，读取本地历史记录
      this.loadLocalHistory();
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
            console.log('[小程序] extractM4a 服务器请求成功，返回数据:', res.data); // 添加日志
            const { success, m4aUrl, title, error, errorCode, cover, shownote, podcastName } = res.data;

            if (success) {
                // 如果成功提取，则继续调用 getHighlights 接口
                this.setData({
                  podcastTitle: title || '未知播客标题',
                  podcastCover: cover || '',
                  podcastName: podcastName || '',
                  resultUrl: m4aUrl, // 在这里设置resultUrl以显示第一张卡片
                  // 清除旧的亮点数据
                  highlightQuote: '',
                  highlightSummary: '',
                  highlightTags: []
                });

                if (shownote) {
                    console.log('[小程序] 成功获取shownote，正在调用 getHighlights...'); // 添加日志
                    this.getHighlights(title, shownote);
                } else {
                    console.warn('[小程序] 未能获取shownote，无法调用 getHighlights'); // 添加警告日志
                    this.setData({
                        statusMessage: '链接提取成功！但无法生成亮点卡片。',
                        errorType: ''
                    });
                    wx.showToast({ title: '提取成功', icon: 'success', duration: 1500 });
                    // 👈 【关键！】在这里加上这一行，把结果存入历史
                    this.saveToHistory(title, m4aUrl);
                    this.setData({ isLoading: false }); // 如果没有shownote，提取流程到此结束
                }

            } else {
                console.error(`[小程序] extractM4a 服务器返回错误: [${errorCode}] ${error}`); // 添加日志
                this.setData({
                    statusMessage: error || '发生未知错误',
                    errorType: errorCode || 'UNKNOWN_ERROR',
                });
                wx.showToast({ title: '提取失败', icon: 'error', duration: 2000 });
                this.setData({ isLoading: false }); // 失败时隐藏 loading
            }
        },
        fail: (err) => {
            console.error('[小程序] wx.request 请求失败:', err); // 添加日志
            this.setData({
                statusMessage: '服务连接失败，请检查网络或稍后再试。',
                errorType: 'NETWORK_ERROR',
            });
            wx.showToast({ title: '请求失败', icon: 'error', duration: 2000 });
            this.setData({ isLoading: false }); // 失败时隐藏 loading
        },
        complete: () => {
            // 在这里不隐藏 loading，因为要等待 getHighlights 的结果
            // this.setData({ isLoading: false }); 
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
            console.log('[小程序] getHighlights API 调用成功，返回数据:', res.data); // 添加日志
            const { success, highlights } = res.data;
            if (success && highlights) {
                this.setData({
                    highlightQuote: highlights.quote || '',
                    highlightSummary: highlights.summary || '',
                    highlightTags: highlights.tags || [],
                    statusMessage: '亮点卡片生成成功！'
                });
            } else {
                console.error('[小程序] getHighlights 接口调用失败:', res.data.error); // 添加日志
                this.setData({
                    statusMessage: '亮点卡片生成失败，请重试或反馈问题。',
                    errorType: 'GENERATE_FAILED' // 新增错误类型
                });
            }
        },
        fail: (err) => {
            console.error('[小程序] getHighlights API 请求失败:', err); // 添加日志
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
  /**
   * 💡 新增：读取本地历史记录
   */
  loadLocalHistory() {
    try {
      const history = wx.getStorageSync('zxy_extract_history') || [];
      this.setData({ historyList: history });
    } catch (e) {
      console.error('读取历史记录失败，但不影响主流程', e);
    }
  },

  /**
   * 💡 新增：保存到本地历史记录
   */
  saveToHistory(title, url) {
    try {
      let history = wx.getStorageSync('zxy_extract_history') || [];
      // 去重：如果这个链接之前提取过，先把它从旧位置删掉，一会顶到最前面
      history = history.filter(item => item.url !== url);
      
      // 插入到数组头部
      history.unshift({
        title: title || '未知播客标题',
        url: url,
        time: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5) // 格式化为：YYYY/MM/DD HH:mm
      });

      // 铁腕手段：只保留最近 10 条，避免本地缓存臃肿
      if (history.length > 10) {
        history = history.slice(0, 10);
      }
      
      wx.setStorageSync('zxy_extract_history', history);
      this.setData({ historyList: history });
    } catch (e) {
      console.error('保存历史记录失败', e);
    }
  },

  /**
   * 💡 新增：点击历史记录直接复制
   */
  onCopyHistoryItem(e) {
    const url = e.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '历史链接已复制', icon: 'success' });
      }
    });
  },

  /**
   * 💡 新增：清空历史记录
   */
  onClearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空所有提取记录吗？',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('zxy_extract_history');
          this.setData({ historyList: [] });
          wx.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  },
});