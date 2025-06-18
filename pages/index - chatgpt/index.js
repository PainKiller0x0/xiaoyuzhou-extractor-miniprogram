Page({
  data: {
    inputValue: '',
    resultUrl: '',
    isLoading: false,
    statusMessage: '',
    progress: 0,
  },

  onExtractTap() {
    const trimmed = this.data.inputValue.trim();
    if (!trimmed) {
      wx.showToast({ title: '链接不能为空', icon: 'none' });
      return;
    }

    this.setData({
      isLoading: true,
      resultUrl: '',
      statusMessage: '',
      progress: 5,
    });

    // ✅ 伪进度模拟器
    this.simulateProgress();

    wx.cloud.callFunction({
      name: 'extractM4a',
      data: { episodeUrl: trimmed }
    }).then(res => {
      const { success, m4aUrl, error } = res.result || {};
      if (success) {
        this.setData({ resultUrl: m4aUrl });
      } else {
        this.setData({ statusMessage: error || '发生未知错误' });
      }
    }).catch(err => {
      console.error('云函数失败:', err);
      this.setData({ statusMessage: '服务调用失败，请稍后重试' });
    }).finally(() => {
      clearInterval(this._progressTimer);
      this.setData({ isLoading: false, progress: 100 });
    });
  },

  simulateProgress() {
    let val = 5;
    this._progressTimer = setInterval(() => {
      if (val < 90) {
        val += Math.random() * 10;
        this.setData({ progress: Math.min(val, 90) });
      }
    }, 300);
  },

  onCopyTap() {
    if (this.data.resultUrl) {
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => wx.showToast({ title: '已复制到剪贴板' })
      });
    }
  }
});
