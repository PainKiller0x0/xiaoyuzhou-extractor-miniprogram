// 云函数入口文件: cloudfunctions/extractM4a/index.js

// 引入我们之前安装的 axios 库
const axios = require('axios');

// 云函数入口函数
exports.main = async (event, context) => {
  // event 对象包含了小程序端调用时传来的所有参数。
  const { episodeUrl } = event;

  // 1. 基本的链接校验
  if (!episodeUrl || !episodeUrl.startsWith('https://www.xiaoyuzhoufm.com/episode/')) {
    return {
      success: false,
      error: '链接格式不正确，请输入有效的小宇宙播客单集链接。',
    };
  }

  console.log(`[云函数] 开始处理链接: ${episodeUrl}`);

  // 2. 抓取和解析网页
  try {
    // 使用 axios 发起网络请求，获取小宇宙页面的 HTML 内容
    const response = await axios.get(episodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const htmlText = response.data;

    // 3. 使用正则表达式提取 m4a 链接
    const m4aRegex = /(https:\/\/media\.xyzcdn\.net\/[^\s"']+\.m4a)/;
    const m4aMatch = htmlText.match(m4aRegex);
    const m4aUrl = m4aMatch ? m4aMatch[0] : null;

    if (m4aUrl) {
      // 4. 如果成功提取，将结果返回给小程序
      console.log(`[云函数] 成功提取到链接: ${m4aUrl}`);
      return {
        success: true,
        m4aUrl: m4aUrl,
      };
    } else {
      console.log('[云函数] 未在页面中找到 m4a 链接');
      return {
        success: false,
        error: '未能在页面中找到音频直链，请确认链接有效。',
      };
    }
  } catch (error) {
    // 5. 如果抓取网页或处理过程中发生任何错误
    console.error('[云函数] 抓取或解析时出错:', error.message);
    return {
      success: false,
      error: '提取失败，可能是网络问题或链接已失效。',
    };
  }
};