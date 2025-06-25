// cloudfunctions/submitFeedback/index.js (移除联系方式字段)
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境，确保与小程序端一致
});

const db = cloud.database(); // 初始化数据库

exports.main = async (event, context) => {
  const { feedbackContent } = event; // 移除 contactInfo
  const wxContext = cloud.getWXContext(); // 获取微信上下文信息，包含用户openid

  if (!feedbackContent || feedbackContent.trim() === '') {
    return {
      success: false,
      error: '反馈内容不能为空。'
    };
  }

  try {
    const res = await db.collection('userFeedback').add({
      data: {
        _openid: wxContext.OPENID, // 记录用户openid，方便识别和联系
        feedbackContent: feedbackContent.trim(),
        // contactInfo: contactInfo ? contactInfo.trim() : '', // 移除此字段
        timestamp: db.serverDate(), // 记录反馈时间
        status: 'pending' // 初始状态，例如：'pending', 'reviewed', 'resolved'
      }
    });

    console.log('[云函数][submitFeedback] 反馈提交成功:', res);

    return {
      success: true,
      message: '反馈已提交，感谢您的支持！'
    };
  } catch (e) {
    console.error('[云函数][submitFeedback] 反馈提交失败:', e);
    return {
      success: false,
      error: `反馈提交失败，请稍后再试。错误信息: ${e.message}`
    };
  }
};