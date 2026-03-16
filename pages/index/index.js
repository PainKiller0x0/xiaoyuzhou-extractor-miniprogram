// pages/index/index.js
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
    historyList: [], 
    showHistoryPopup: false,
    isGeneratingPoster: false // 💡 新增：用于防抖和按钮 Loading 状态
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
        header: { 'content-type': 'application/json' },
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
  preventClose() {},
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
        this.setData({ showHistoryPopup: false });
        wx.showToast({ title: '已复制，即将跳转', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}`
          });
        }, 500); 
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
  },

  // ==========================================
  // 💡 核心新增：生成并绘制 Canvas 金句海报
  // ==========================================
  async onGeneratePoster() {
    this.setData({ isGeneratingPoster: true });
    wx.showLoading({ title: '正在生成海报...' });

    try {
      await this.drawPoster();
    } catch (error) {
      console.error('海报生成失败', error);
      wx.showToast({ title: '海报生成失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ isGeneratingPoster: false });
    }
  },

  drawPoster() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0] || !res[0].node) return reject(new Error('未找到 Canvas 节点'));
          
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设定高清画布尺寸
          const width = 750;
          const height = 1334;
          canvas.width = width;
          canvas.height = height;

          // 1. 绘制纯白背景底色
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // 图像加载辅助函数
          const loadImage = (src) => {
            return new Promise((imgResolve, imgReject) => {
              const img = canvas.createImage();
              img.onload = () => imgResolve(img);
              img.onerror = (e) => {
                console.warn('图片加载失败:', src, e);
                imgResolve(null); // 图片加载失败也不阻断主流程，直接返回 null
              };
              img.src = src;
            });
          };

          try {
            // 2. 绘制播客封面图
            if (this.data.podcastCover) {
              const coverImg = await loadImage(this.data.podcastCover);
              if (coverImg) {
                ctx.drawImage(coverImg, (width - 320) / 2, 120, 320, 320);
              }
            }

            // 3. 绘制播客标题
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            const title = this.data.podcastTitle || '小宇宙播客推荐';
            const shortTitle = title.length > 20 ? title.substring(0, 19) + '...' : title;
            ctx.fillText(shortTitle, width / 2, 520);

            // 4. 绘制醒目双引号装饰
            ctx.fillStyle = '#e0e6e8';
            ctx.font = 'bold 120px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('“', 60, 660);

            // 5. 绘制核心金句文案 (支持自动换行)
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 44px sans-serif';
            ctx.textAlign = 'left';
            const quoteText = this.data.highlightQuote || '这是一期直击灵魂的播客，等待你的倾听。';
            this.drawText(ctx, quoteText, 100, 720, 550, 68);

            // 6. 绘制底部分割线
            ctx.beginPath();
            ctx.moveTo(60, 1100);
            ctx.lineTo(690, 1100);
            ctx.strokeStyle = '#eeeeee';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 7. 绘制底部导流引导文案
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('摘星译 · 收录宇宙絮语', 60, 1180);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#bdc3c7';
            ctx.fillText('长按扫码，一键提取音频与文稿', 60, 1230);

            // 8. 绘制你自己的小程序二维码
            const qrCodeImg = await loadImage('/images/qrcode.png');
            if (qrCodeImg) {
              ctx.drawImage(qrCodeImg, 550, 1135, 140, 140);
            }

            // 9. 导出生成图片，并打开全屏预览
            wx.canvasToTempFilePath({
              canvas: canvas,
              success: (res) => {
                wx.previewImage({
                  urls: [res.tempFilePath],
                  current: res.tempFilePath
                });
                resolve();
              },
              fail: reject
            });

          } catch (e) {
            reject(e);
          }
        });
    });
  },

  // Canvas 文本换行计算辅助函数
  drawText(ctx, text, x, y, maxWidth, lineHeight) {
    let line = '';
    let currentY = y;
    for (let i = 0; i < text.length; i++) {
      let testLine = line + text[i];
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = text[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
});