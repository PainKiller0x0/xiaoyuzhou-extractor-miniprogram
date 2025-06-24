// 云函数入口文件: cloudfunctions/extractM4a/index.js (最终合并版)

const axios = require('axios');

exports.main = async (event, context) => {
  const { episodeUrl } = event;

  // 1. 基本的链接校验
  if (!episodeUrl || !episodeUrl.startsWith('https://www.xiaoyuzhoufm.com/episode/')) {
    return {
      success: false,
      errorCode: 'INVALID_LINK', // 新增：错误码
      error: '链接格式不正确，请输入有效的小宇宙播客单集链接。',
    };
  }

  console.log(`[云函数] 开始处理链接: ${episodeUrl}`);

  // 2. 抓取和解析网页
  try {
    const response = await axios.get(episodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 新增：设置10秒的请求超时
    });
    const htmlText = response.data;

    // 3. 使用正则表达式提取 m4a 链接
    const m4aRegex = /(https:\/\/media\.xyzcdn\.net\/[^\s"']+\.m4a)/;
    const m4aMatch = htmlText.match(m4aRegex);
    const m4aUrl = m4aMatch ? m4aMatch[0] : null;

    // --- 你的、更健壮的标题提取与清理逻辑 (完全保留) ---
    let podcastTitle = '未知播客标题';
    let rawTitle = '';
    // 尝试从 <title> 标签中提取标题
    const titleRegex = /<title>(.*?)<\/title>/;
    const titleMatch = htmlText.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
        rawTitle = titleMatch[1];
    } else {
        // 如果 <title> 标签没找到，尝试从 Open Graph 的 og:title 属性中提取
        const ogTitleRegex = /<meta\s+property="og:title"\s+content="([^"]*)"\s*\/?>/;
        const ogTitleMatch = htmlText.match(ogTitleRegex);
        if (ogTitleMatch && ogTitleMatch[1]) {
            rawTitle = ogTitleMatch[1];
        }
    }
    if (rawTitle) {
        let cleanedTitle = rawTitle;
        // 查找 " | 小宇宙" 并直接截断
        const xiaoyuzhouSuffixIndex = cleanedTitle.indexOf(' | 小宇宙');
        if (xiaoyuzhouSuffixIndex !== -1) {
            cleanedTitle = cleanedTitle.substring(0, xiaoyuzhouSuffixIndex);
        }
        // 清理末尾可能残留的空格和破折号
        podcastTitle = cleanedTitle.replace(/[-\s]+$/, '').trim();
        // 兜底：如果清理后标题变空了，就用原始标题
        if (podcastTitle === '') {
            podcastTitle = rawTitle.trim();
        }
    }
    // --- 标题提取逻辑结束 ---

    if (m4aUrl) {
      // 4. 如果成功提取，将结果返回给小程序
      console.log(`[云函数] 成功提取到链接: ${m4aUrl}`);
      console.log(`[云函数] 清理后标题: ${podcastTitle}`);
      return {
        success: true,
        m4aUrl: m4aUrl,
        title: podcastTitle,
      };
    } else {
      // 5. 解析失败 (页面中找不到链接)
      console.log('[云函数] 未在页面中找到 m4a 链接');
      return {
        success: false,
        errorCode: 'PARSE_FAILED', // 新增：错误码
        error: '解析服务暂时不可用，请稍后或反馈问题。',
      };
    }
  } catch (error) {
    // 6. 网络问题 (超时或连接失败等)
    console.error('[云函数] 抓取或解析时出错:', error.message);
    let errorMessage = '提取失败，可能是网络问题或链接已失效。';
    // 判断是否是超时错误
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = '网络不稳定，请求超时了，请重试。';
    }

    return {
      success: false,
      errorCode: 'NETWORK_ERROR', // 新增：错误码
      error: errorMessage,
    };
  }
};