// cloudfunctions/extractM4a/parsers/xiaoyuzhouParser.js
// 小宇宙播客链接解析器

exports.parse = async (episodeUrl, axios) => {
  console.log(`[小宇宙解析器] 开始解析: ${episodeUrl}`);

  try {
    const response = await axios.get(episodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10秒请求超时
    });
    const htmlText = response.data;

    // 提取 m4a 链接
    const m4aRegex = /(https:\/\/media\.xyzcdn\.net\/[^\s"']+\.m4a)/;
    const m4aMatch = htmlText.match(m4aRegex);
    const m4aUrl = m4aMatch ? m4aMatch[0] : null;

    // 提取标题逻辑 (与之前 extractM4a/index.js 中的逻辑相同)
    let podcastTitle = '未知播客标题';
    let rawTitle = '';
    const titleRegex = /<title>(.*?)<\/title>/;
    const titleMatch = htmlText.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
        rawTitle = titleMatch[1];
    } else {
        const ogTitleRegex = /<meta\s+property="og:title"\s+content="([^"]*)"\s*\/?>/;
        const ogTitleMatch = htmlText.match(ogTitleRegex);
        if (ogTitleMatch && ogTitleMatch[1]) {
            rawTitle = ogTitleMatch[1];
        }
    }
    if (rawTitle) {
        let cleanedTitle = rawTitle;
        const xiaoyuzhouSuffixIndex = cleanedTitle.indexOf(' | 小宇宙');
        if (xiaoyuzhouSuffixIndex !== -1) {
            cleanedTitle = cleanedTitle.substring(0, xiaoyuzhouSuffixIndex);
        }
        podcastTitle = cleanedTitle.replace(/[-\s]+$/, '').trim();
        if (podcastTitle === '') {
            podcastTitle = rawTitle.trim();
        }
    }

    if (m4aUrl) {
      console.log(`[小宇宙解析器] 成功提取到链接: ${m4aUrl}`);
      console.log(`[小宇宙解析器] 提取到标题: ${podcastTitle}`);
      return {
        success: true,
        m4aUrl: m4aUrl,
        title: podcastTitle,
      };
    } else {
      console.log('[小宇宙解析器] 未在页面中找到 m4a 链接');
      return {
        success: false,
        errorCode: 'PARSE_FAILED',
        error: '小宇宙播客单集解析失败，未能找到音频链接。',
      };
    }
  } catch (error) {
    console.error('[小宇宙解析器] 抓取或解析时出错:', error.message);
    let errorMessage = '小宇宙链接提取失败，可能是网络问题或链接已失效。';
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = '小宇宙链接网络不稳定，请求超时了，请重试。';
    }
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: errorMessage,
    };
  }
};