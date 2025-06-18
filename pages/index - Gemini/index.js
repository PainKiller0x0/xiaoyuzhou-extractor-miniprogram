// pages/index/index.js
Page({
  /**
   * 页面的初始数据
   * 这里是页面的“数据仓库”，WXML 中所有用 {{...}} 包裹的变量都来自这里。
   */
  data: {
    inputValue: '', // 绑定输入框的内容
    resultUrl: '', // 用于存储提取到的音频链接
    isLoading: false, // 控制“提取”按钮是否显示加载中状态
    statusMessage: '', // 用于显示错误或状态提示信息
  },

  /**
   * “提取音频”按钮的点击事件处理函数
   */
  onExtractTap() {
    // 1. 检查用户是否输入了内容
    if (!this.data.inputValue.trim()) {
      // 如果输入为空，弹出一个轻提示
      wx.showToast({
        title: '链接不能为空',
        icon: 'none' // 'none' 表示不显示图标，只显示文字
      });
      return; // 结束函数，不再继续往下执行
    }

    // 2. 重置界面状态，准备开始提取
    this.setData({
      isLoading: true,  // 显示按钮的加载中状态
      resultUrl: '',    // 清空上一次的提取结果
      statusMessage: '' // 清空上一次的状态提示
    });

    // 3. 调用我们之前部署的云函数
    wx.cloud.callFunction({
      name: 'extractM4a', // 云函数的名称，必须与我们创建的一致
      data: {
        episodeUrl: this.data.inputValue // 将输入框的内容作为参数传给云函数
      }
    }).then(res => {
      // 4. 云函数调用成功，处理返回的结果
      console.log('云函数调用成功:', res);
      const { success, m4aUrl, error } = res.result; // 从 res.result 中解构出我们定义的数据

      if (success) {
        // 如果 success 为 true，说明提取成功
        this.setData({
          resultUrl: m4aUrl // 将获取到的 m4aUrl 更新到页面的数据仓库中
        });
      } else {
        // 如果 success 为 false，说明提取失败
        this.setData({
          statusMessage: error || '发生未知错误' // 将错误信息显示出来
        });
      }
    }).catch(err => {
      // 5. 云函数调用本身失败（比如网络不通、云函数不存在等）
      console.error('云函数调用失败:', err);
      this.setData({
        statusMessage: '服务调用失败，请检查网络或稍后再试'
      });
    }).finally(() => {
      // 6. 无论成功还是失败，最后都要结束加载状态
      this.setData({
        isLoading: false
      });
    });
  },

  /**
   * “复制链接”按钮 和 链接显示区域 的点击事件处理函数
   */
  onCopyTap() {
    if (this.data.resultUrl) {
      // 调用小程序 API，将链接设置到系统剪贴板
      wx.setClipboardData({
        data: this.data.resultUrl,
        success: () => {
          // 复制成功后，给用户一个轻提示
          wx.showToast({
            title: '已复制到剪贴板',
          });
        }
      });
    }
  }
});