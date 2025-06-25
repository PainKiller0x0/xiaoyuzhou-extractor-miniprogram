// pages/feedback/feedback.js (移除联系方式相关逻辑)
Page({

  /**
   * 页面的初始数据
   */
  data: {
    feedbackContent: '',
    // contactInfo: '', // 移除此字段
    isSubmitting: false // 控制提交按钮的加载状态
  },

  /**
   * 监听反馈内容输入
   */
  onFeedbackContentInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  /**
   * 监听联系方式输入 (此方法可以移除，但为了安全保留，确保其不被调用)
   */
  // onContactInfoInput(e) {
  //   this.setData({
  //     contactInfo: e.detail.value
  //   });
  // },

  /**
   * 提交反馈
   */
  async onSubmitFeedback() {
    const { feedbackContent } = this.data; // 移除 contactInfo

    if (feedbackContent.trim() === '') {
      wx.showToast({
        title: '反馈内容不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      isSubmitting: true // 显示加载状态
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'submitFeedback', // 调用我们刚刚创建的云函数
        data: {
          feedbackContent: feedbackContent.trim(),
          // contactInfo: contactInfo.trim() // 移除此字段
        }
      });

      console.log('[小程序] 反馈提交结果:', res);

      if (res.result.success) {
        wx.showToast({
          title: '反馈成功！',
          icon: 'success',
          duration: 2000
        });
        // 成功后清空表单并返回上一页
        this.setData({
          feedbackContent: '',
          // contactInfo: '' // 移除此字段
        });
        setTimeout(() => {
          wx.navigateBack(); // 返回上一页
        }, 2000);
      } else {
        wx.showModal({
          title: '提交失败',
          content: res.result.error || '发生未知错误，请重试。',
          showCancel: false,
          confirmText: '确定'
        });
      }
    } catch (err) {
      console.error('[小程序] 调用 submitFeedback 云函数失败', err);
      wx.showModal({
        title: '提交失败',
        content: '服务连接异常，请检查网络或稍后再试。',
        showCancel: false,
        confirmText: '确定'
      });
    } finally {
      this.setData({
        isSubmitting: false // 隐藏加载状态
      });
    }
  }
});