// pages/index/index.js (终极版 - 包含底部弹窗历史记录及直达跳转)
Page({
  data: {
    inputValue: '', 
    lastInputValue: '', 
    resultUrl: '',
    podcastTitle: '',
    isLoading: false,
    statusMessage: '',
    errorType: '', 
    safeAreaBottom: 0, 
    containerPaddingBottom: 0, 
    showPasteButton: true, 
    tongyiGongzhonghaoArticleUrl: 'https://mp.weixin.qq.com/s/w8O2PB-8hA5u27T7UuX7oQ',
    highlightQuote: '',
    highlightSummary: '',
    highlightTags: [],
    podcastCover: '',
    podcastName: '',
    historyList: [], // 本地历史记录数据
    showHistoryPopup: false // 控制历史记录弹窗显示
  },

  onLoad() {
    this.getSafeAreaInfo();
  },

  onShow() {
      const shouldBeVisible = !this.data.isLoading && !this.data.resultUrl && !this.data.inputValue.trim() && !this.data.errorType;
      this.setData({ showPasteButton: shouldBeVisible });
      this.loadLocalHistory();
  },

  onInput(e) {
    const value = e.detail.value;
    this.setData({
      inputValue: value,
      showPasteButton: !value.trim(),
      statusMessage: '',
      errorType: '',
    });
  },

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
        this.setData({ 
          safeAreaBottom: 10,
          containerPaddingBottom: 350
        });
      }
    });
  },

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
        wx.showToast({ title: '无法获取剪贴板内容', icon: 'none' });
      }
    });
  },

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
                this.setData({
                  podcastTitle: title || '未知播客标题',
                  podcastCover: cover || '',
                  podcastName: podcastName || '',
                  resultUrl: m4aUrl, 
                  highlightQuote: '',
                  highlightSummary: '',
                  highlightTags: []
                });

                // 【核心修复】无论有没有简介，必须先存历史记录！
                this.saveToHistory(title, m4aUrl);

                if (shownote) {
                    this.getHighlights(title, shownote);
                } else {
                    this.setData({
                        statusMessage: '链接提取成功！但无法生成亮点卡片。',
                        errorType: ''
                    });
                    wx.showToast({ title: '提取成功', icon: 'success', duration: 1500 });
                    this.setData({ isLoading: false }); 
                }

            } else {
                this.setData({
                    statusMessage: error || '发生未知错误',
                    errorType: errorCode || 'UNKNOWN_ERROR',
                });
                wx.showToast({ title: '提取失败', icon: 'error', duration: 2000 });
                this.setData({ isLoading: false }); 
            }
        },
        fail: (err) => {
            this.setData({
                statusMessage: '服务连接失败，请检查网络或稍后再试。',
                errorType: 'NETWORK_ERROR',
            });
            wx.showToast({ title: '请求失败', icon: 'error', duration: 2000 });
            this.setData({ isLoading: false }); 
        }
    });
  },

  getHighlights(title, shownote) {
    const serverApiUrl = 'https://zhaixingyi.painkiller.top/api/getHighlights';

    this.setData({
        statusMessage: '正在分析节目简介，生成亮点...',
    });

    wx.request({
        url: serverApiUrl,
        method: 'POST',
        data: { title, shownote },
        header: { 'content-type': 'application/json' },
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
                this.setData({
                    statusMessage: '亮点卡片生成失败，请重试或反馈问题。',
                    errorType: 'GENERATE_FAILED' 
                });
            }
        },
        fail: (err) => {
            this.setData({
                statusMessage: '亮点卡片 API 服务连接失败，请稍后重试。',
                errorType: 'NETWORK_ERROR'
            });
        },
        complete: () => {
            this.setData({ isLoading: false }); 
            this.onShow();
        }
    });
  },

  onRetryTap() {
    this.setData({
      inputValue: this.data.lastInputValue,
      statusMessage: '',
      errorType: '',
    }, () => {
      this.onExtractTap();
    });
  },
  
  onFeedbackTap() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  onCopyLinkOnly() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => { wx.showToast({ title: '已复制', icon: 'success', duration: 1500 }); },
        fail: () => { wx.showToast({ title: '复制失败', icon: 'none' }); }
      });
    }
  },

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

  onShareAppMessage(res) {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    if (this.data.resultUrl && this.data.podcastTitle) {
      shareTitle = `【${this.data.podcastTitle}】音频直链已提取，快来听！ - 摘星译`;
    }
    return { title: shareTitle, path: '/pages/index/index' };
  },

  onShareTimeline() {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    if (this.data.resultUrl && this.data.podcastTitle) {
      shareTitle = `【${this.data.podcastTitle}】音频直链已提取，快来听！ - 摘星译`;
    }
    return { title: shareTitle, query: '' };
  },

  // ==========================================
  // 底部弹窗 & 历史记录机制
  // ==========================================
  onShowHistory() {
    this.setData({ showHistoryPopup: true });
  },

  onCloseHistory() {
    this.setData({ showHistoryPopup: false });
  },

  preventClose() {
    // 阻止冒泡，防止点击弹窗内容时关闭弹窗
  },
  
  loadLocalHistory() {
    try {
      const history = wx.getStorageSync('zxy_extract_history') || [];
      this.setData({ historyList: history });
    } catch (e) {
      console.error('读取历史记录失败', e);
    }
  },

  saveToHistory(title, url) {
    try {
      let history = wx.getStorageSync('zxy_extract_history') || [];
      history = history.filter(item => item.url !== url);
      
      history.unshift({
        title: title || '未知播客标题',
        url: url,
        time: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5) 
      });

      if (history.length > 10) history = history.slice(0, 10);
      
      wx.setStorageSync('zxy_extract_history', history);
      this.setData({ historyList: history });
    } catch (e) {
      console.error('保存历史记录失败', e);
    }
  },

  onCopyHistoryItem(e) {
    const url = e.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        // 【核心交互升级】关闭弹窗 -> 提示复制成功 -> 直接跳转通义听悟
        this.setData({ showHistoryPopup: false });
        wx.showToast({ title: '已复制，即将跳转', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}`
          });
        }, 500); // 稍微延迟，让Toast能看清
      },
      fail: () => { wx.showToast({ title: '复制失败', icon: 'none' }); }
    });
  },

  onClearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空所有提取记录吗？',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('zxy_extract_history');
          this.setData({ historyList: [], showHistoryPopup: false });
          wx.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  }
});