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
    isGeneratingPoster: false 
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
        this.setData({ safeAreaBottom: 10, containerPaddingBottom: 350 });
      }
    });
  },

  onPasteLinkTap() {
    wx.getClipboardData({
      success: (res) => {
        const clipboardData = res.data.trim();
        if (clipboardData) {
          this.setData({
            inputValue: clipboardData, showPasteButton: false, statusMessage: '', errorType: '',
          }, () => {
            wx.showToast({ title: '已粘贴', icon: 'none', duration: 1000 });
          });
        } else {
          wx.showToast({ title: '剪贴板没有内容', icon: 'none' });
        }
      },
      fail: () => { wx.showToast({ title: '无法获取剪贴板内容', icon: 'none' }); }
    });
  },

  onExtractTap() {
    const urlToExtract = this.data.inputValue.trim();
    if (!urlToExtract) {
      this.setData({ statusMessage: '请输入小宇宙播客单集链接', errorType: 'INVALID_LINK' });
      return;
    }

    this.setData({
      isLoading: true, resultUrl: '', podcastTitle: '', statusMessage: '正在分析链接，请稍候...',
      errorType: '', showPasteButton: false, lastInputValue: urlToExtract,
    });
    
    const serverApiUrl = 'https://zhaixingyi.painkiller.top/api/extractM4a';

    wx.request({
        url: serverApiUrl, method: 'POST', data: { episodeUrl: urlToExtract }, header: { 'content-type': 'application/json' },
        success: (res) => {
            const { success, m4aUrl, title, error, errorCode, cover, shownote, podcastName } = res.data;
            if (success) {
                this.setData({
                  podcastTitle: title || '未知播客标题', podcastCover: cover || '',
                  podcastName: podcastName || '', resultUrl: m4aUrl, 
                  highlightQuote: '', highlightSummary: '', highlightTags: []
                });
                this.saveToHistory(title, m4aUrl);

                if (shownote) {
                    this.getHighlights(title, shownote);
                } else {
                    this.setData({ statusMessage: '链接提取成功！但无法生成亮点卡片。', errorType: '' });
                    wx.showToast({ title: '提取成功', icon: 'success', duration: 1500 });
                    this.setData({ isLoading: false }); 
                }
            } else {
                this.setData({ statusMessage: error || '发生未知错误', errorType: errorCode || 'UNKNOWN_ERROR', });
                wx.showToast({ title: '提取失败', icon: 'error', duration: 2000 });
                this.setData({ isLoading: false }); 
            }
        },
        fail: () => {
            this.setData({ statusMessage: '服务连接失败，请检查网络或稍后再试。', errorType: 'NETWORK_ERROR', });
            wx.showToast({ title: '请求失败', icon: 'error', duration: 2000 });
            this.setData({ isLoading: false }); 
        }
    });
  },

  getHighlights(title, shownote) {
    const serverApiUrl = 'https://zhaixingyi.painkiller.top/api/getHighlights';
    this.setData({ statusMessage: '正在分析节目简介，生成亮点...' });

    wx.request({
        url: serverApiUrl, method: 'POST', 
        data: { title, shownote, version: '0.6.0' },
        header: { 'content-type': 'application/json' },
        success: (res) => {
            const { success, highlights } = res.data;
            if (success && highlights) {
                this.setData({
                    highlightQuote: highlights.quote || '', highlightSummary: highlights.summary || '',
                    highlightTags: highlights.tags || [], statusMessage: '亮点卡片生成成功！'
                });
            } else {
                this.setData({ statusMessage: '亮点卡片生成失败，请重试或反馈问题。', errorType: 'GENERATE_FAILED' });
            }
        },
        fail: () => {
            this.setData({ statusMessage: '亮点卡片 API 服务连接失败，请稍后重试。', errorType: 'NETWORK_ERROR' });
        },
        complete: () => {
            this.setData({ isLoading: false }); 
            this.onShow();
        }
    });
  },

  onRetryTap() {
    this.setData({ inputValue: this.data.lastInputValue, statusMessage: '', errorType: '', }, () => { this.onExtractTap(); });
  },
  onFeedbackTap() { wx.navigateTo({ url: '/pages/feedback/feedback' }); },

  onCopyLinkOnly() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => { wx.showToast({ title: '已复制', icon: 'success', duration: 1500 }); }
      });
    }
  },

  onCopyAndNavigateTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          wx.showToast({ title: '已复制，即将跳转', icon: 'success', duration: 1500 });
          wx.navigateTo({ url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}` });
        }
      });
    }
  },

  onResetTap() {
    this.setData({
      inputValue: '', resultUrl: '', podcastTitle: '', isLoading: false, statusMessage: '', errorType: '',
      showPasteButton: true, highlightQuote: '', highlightSummary: '', highlightTags: [], podcastCover: '', podcastName: ''
    });
  },

  onShareAppMessage() {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    if (this.data.resultUrl && this.data.podcastTitle) { shareTitle = `【${this.data.podcastTitle}】音频直链已提取，快来听！ - 摘星译`; }
    return { title: shareTitle, path: '/pages/index/index' };
  },

  onShareTimeline() {
    let shareTitle = '摘星译：轻松提取小宇宙播客音频，让知识随身听！';
    if (this.data.resultUrl && this.data.podcastTitle) { shareTitle = `【${this.data.podcastTitle}】音频直链已提取，快来听！ - 摘星译`; }
    return { title: shareTitle, query: '' };
  },

  onShowHistory() { this.setData({ showHistoryPopup: true }); },
  onCloseHistory() { this.setData({ showHistoryPopup: false }); },
  preventClose() {},
  
  loadLocalHistory() {
    try {
      const history = wx.getStorageSync('zxy_extract_history') || [];
      this.setData({ historyList: history });
    } catch (e) {}
  },
  
  saveToHistory(title, url) {
    try {
      let history = wx.getStorageSync('zxy_extract_history') || [];
      history = history.filter(item => item.url !== url);
      history.unshift({
        title: title || '未知播客标题', url: url,
        time: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5) 
      });
      if (history.length > 10) history = history.slice(0, 10);
      wx.setStorageSync('zxy_extract_history', history);
      this.setData({ historyList: history });
    } catch (e) {}
  },
  
  onCopyHistoryItem(e) {
    const url = e.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        this.setData({ showHistoryPopup: false });
        wx.showToast({ title: '已复制，即将跳转', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/go-to-tongyi/go-to-tongyi?url=${encodeURIComponent(this.data.tongyiGongzhonghaoArticleUrl)}` });
        }, 500); 
      }
    });
  },
  
  onClearHistory() {
    wx.showModal({
      title: '清空历史', content: '确定要清空所有提取记录吗？', confirmColor: '#e74c3c',
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
  // 💡 终极像素级对齐海报引擎：强迫症福音
  // ==========================================
  async onGeneratePoster() {
    this.setData({ isGeneratingPoster: true });
    wx.showLoading({ title: '正在渲染海报...' });

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
          
          const width = 750;
          const height = 1334;
          canvas.width = width;
          canvas.height = height;

          const drawRoundRect = (x, y, w, h, r) => {
            ctx.beginPath();
            ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
            ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 2);
            ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5);
            ctx.arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI);
            ctx.closePath();
          };

          // 保持透明大圆角底板
          ctx.clearRect(0, 0, width, height); 
          ctx.save();
          drawRoundRect(0, 0, width, height, 48); 
          ctx.clip(); 

          // 整体渐变灰外框
          const outerPaddingX = 25; 
          const outerPaddingY = 30; 
          
          ctx.save();
          const grd = ctx.createLinearGradient(0, 0, 0, height);
          grd.addColorStop(0, '#f8f9fa'); 
          grd.addColorStop(1, '#eef2f5'); 
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();

          const loadImage = (src) => {
            return new Promise((imgResolve) => {
              const img = canvas.createImage();
              img.onload = () => imgResolve(img);
              img.onerror = () => imgResolve(null); 
              img.src = src;
            });
          };

          try {
            // 内置白卡片 + 阴影
            const innerCardWidth = width - outerPaddingX * 2;
            const innerCardRadius = 36;
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.05)'; 
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 10;
            drawRoundRect(outerPaddingX, outerPaddingY, innerCardWidth, height - outerPaddingY * 2, innerCardRadius);
            ctx.fillStyle = '#ffffff'; 
            ctx.fill();
            ctx.restore();

            // 内卡裁切区域
            ctx.save();
            drawRoundRect(outerPaddingX, outerPaddingY, innerCardWidth, height - outerPaddingY * 2, innerCardRadius);
            ctx.clip(); 

            // 1. 绘制播客封面
            const coverSize = 280;
            const coverX = (width - coverSize) / 2;
            const coverY = outerPaddingY + 120; 
            const coverRadius = 36;

            if (this.data.podcastCover) {
              const coverImg = await loadImage(this.data.podcastCover);
              if (coverImg) {
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
                ctx.shadowBlur = 40;
                ctx.shadowOffsetY = 15;
                drawRoundRect(coverX, coverY, coverSize, coverSize, coverRadius);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.restore();

                ctx.save();
                drawRoundRect(coverX, coverY, coverSize, coverSize, coverRadius);
                ctx.clip();
                ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
                ctx.restore();
              }
            }

            // 2. 播客标题
            ctx.fillStyle = '#1c2833';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            const title = this.data.podcastTitle || '小宇宙播客推荐';
            const shortTitle = title.length > 18 ? title.substring(0, 17) + '...' : title;
            ctx.fillText(shortTitle, width / 2, coverY + coverSize + 80);

            // ==========================================
            // 💡 修复重点：金句卡片绝对居中排版逻辑
            // ==========================================
            let quoteText = this.data.highlightQuote || '这是一期直击灵魂的播客，等待你的倾听。';
            quoteText = quoteText.trim();
            // 【智能补全句号】
            if (!/[。！？.!?”’]$/.test(quoteText)) {
                quoteText += '。';
            }

            const boxX = 60;
            const boxWidth = 630;
            const boxY = coverY + coverSize + 160; 

            // 【精确水平对称居中算法】
            // 设定文本块最大宽度为 460，此时左侧留白 = (630 - 460) / 2 = 85
            const quoteMaxWidth = 460; 
            const boxInnerMargin = 85; 
            
            ctx.font = 'bold 42px sans-serif';
            const quoteLineHeight = 72;
            const fontSize = 42;
            
            let lines = [];
            let line = '';
            for (let i = 0; i < quoteText.length; i++) {
              let testLine = line + quoteText[i];
              if (ctx.measureText(testLine).width > quoteMaxWidth && i > 0) {
                lines.push(line);
                line = quoteText[i];
              } else {
                line = testLine;
              }
            }
            lines.push(line);

            // 【精确垂直对称居中算法】
            const boxPaddingY = 80; // 上下边距锁定为相同的 80px
            // 计算精准文本高度，去除最后一行底部自带的行距虚高
            const textBlockHeight = (lines.length - 1) * quoteLineHeight + fontSize; 
            const boxHeight = boxPaddingY * 2 + textBlockHeight; 

            // 卡片底色
            ctx.fillStyle = '#f4f9fb';
            drawRoundRect(boxX, boxY, boxWidth, boxHeight, 24);
            ctx.fill();

            // 蓝条装饰
            ctx.save();
            drawRoundRect(boxX, boxY, boxWidth, boxHeight, 24);
            ctx.clip(); 
            ctx.fillStyle = '#3A8DFF';
            ctx.fillRect(boxX, boxY, 12, boxHeight);
            ctx.restore();

            // ==========================================
            // 💡 修复重点：绝对对称的前后双引号
            // ==========================================
            ctx.fillStyle = '#d6eaf8';
            ctx.font = 'bold 110px sans-serif';
            const quoteMargin = 35; // 引号距离边缘的对称距离
            
            // 左上角前引号
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top'; 
            ctx.fillText('“', boxX + quoteMargin, boxY + 25); 

            // 右下角闭合引号
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom'; 
            ctx.fillText('”', boxX + boxWidth - quoteMargin, boxY + boxHeight - 5); 

            // ==========================================
            // 💡 修复重点：绘制居中金句正文
            // ==========================================
            ctx.fillStyle = '#1c2833';
            ctx.font = 'bold 42px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top'; // 使用 top 锚点配合我们的精确计算
            
            let currentY = boxY + boxPaddingY; // 从顶层 padding 处开始画
            lines.forEach(textLine => {
              ctx.fillText(textLine, boxX + boxInnerMargin, currentY); 
              currentY += quoteLineHeight;
            });
            ctx.textBaseline = 'alphabetic'; // 画完恢复默认基线，不影响后续代码

            // 绘制标签模块
            if (this.data.highlightTags && this.data.highlightTags.length > 0) {
              const tagTextColor = '#7f8c8d';
              const tagBgColor = '#f2f4f6'; 
              const tagRadius = 10;
              const tagPaddingX = 16;
              const tagPaddingY = 8;
              const tagGap = 16;
              
              const tagsAreaY = boxY + boxHeight + 40;
              let currentTagX = boxX + 32; // 对齐卡片左侧视觉线
              let currentTagY = tagsAreaY + tagPaddingY;

              ctx.textBaseline = 'middle'; // 标签使用绝对中线对齐

              this.data.highlightTags.forEach(tagText => {
                ctx.font = '22px sans-serif'; 
                const fullTagText = `#${tagText}`;
                const textWidth = ctx.measureText(fullTagText).width;
                const tagW = textWidth + tagPaddingX * 2;
                const tagH = 22 + tagPaddingY * 2; 

                // 折行计算
                if (currentTagX + tagW > boxX + boxWidth - 32) {
                   currentTagX = boxX + 32;
                   currentTagY += tagH + tagGap;
                }

                // 绘制背景（基于中线 Y 计算矩形顶部）
                drawRoundRect(currentTagX, currentTagY - tagH / 2, tagW, tagH, tagRadius);
                ctx.fillStyle = tagBgColor;
                ctx.fill();

                // 绘制文字
                ctx.fillStyle = tagTextColor;
                ctx.textAlign = 'center';
                ctx.fillText(fullTagText, currentTagX + tagW / 2, currentTagY); 

                currentTagX += tagW + tagGap;
              });
              ctx.textBaseline = 'alphabetic'; // 恢复
            }

            // 绘制底部分割线
            ctx.beginPath();
            ctx.moveTo(60, 1100); 
            ctx.lineTo(690, 1100);
            ctx.strokeStyle = '#eef2f5'; 
            ctx.lineWidth = 2;
            ctx.stroke();

            // 绘制底部信息
            ctx.fillStyle = '#7f8c8d';
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('摘星译 · 收录宇宙絮语', 60, 1175); 
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#bdc3c7';
            ctx.fillText('长按扫码，一键提取音频与转录文稿', 60, 1225);

            // 二维码
            const qrCodeImg = await loadImage('/images/qrcode.png');
            if (qrCodeImg) {
              ctx.drawImage(qrCodeImg, 540, 1130, 140, 140);
            }

            ctx.restore(); // 结束整图裁切

            // 强制保存为 PNG 以防透明背景变黑
            wx.canvasToTempFilePath({
              canvas: canvas,
              fileType: 'png', 
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
  }
});