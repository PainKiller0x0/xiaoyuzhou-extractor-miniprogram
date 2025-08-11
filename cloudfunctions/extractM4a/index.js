// 云函数入口文件: cloudfunctions/extractM4a/index.js (v0.4.0 - 引入多平台支持)

const axios = require('axios');
const url = require('url'); // 引入 url 模块用于解析 URL

// 导入各个平台的解析器（暂时是占位符，后续会具体实现）
const xiaoyuzhouParser = require('./parsers/xiaoyuzhouParser');
// const ximalayaParser = require('./parsers/ximalayaParser'); // 暂时注释，待实现
// const lizhiParser = require('./parsers/lizhiParser');     // 暂时注释，待实现
// const applePodcastsParser = require('./parsers/applePodcastsParser'); // 暂时注释，待实现

exports.main = async (event, context) => {
  const { episodeUrl } = event;

  // 1. 基本的链接校验
  if (!episodeUrl || (typeof episodeUrl !== 'string') || episodeUrl.trim() === '') {
    return {
      success: false,
      errorCode: 'INVALID_LINK',
      error: '链接格式不正确，请输入有效的播客单集链接。',
    };
  }

  console.log(`[云函数] 开始处理链接: ${episodeUrl}`);

  let parsedUrl;
  try {
    parsedUrl = new url.URL(episodeUrl); // 使用 URL 对象解析链接
  } catch (e) {
    return {
      success: false,
      errorCode: 'INVALID_LINK_FORMAT', // 新增错误码
      error: '链接格式不正确，无法识别。',
    };
  }

  const hostname = parsedUrl.hostname; // 获取域名

  let parserResult;

  // 2. 智能识别播客平台并调用对应的解析器
  if (hostname.includes('xiaoyuzhoufm.com')) {
    console.log('[云函数] 识别到小宇宙播客链接。');
    parserResult = await xiaoyuzhouParser.parse(episodeUrl, axios);
  } else if (hostname.includes('ximalaya.com')) {
    console.log('[云函数] 识别到喜马拉雅播客链接。');
    // parserResult = await ximalayaParser.parse(episodeUrl, axios); // 待实现
    return {
      success: false,
      errorCode: 'PLATFORM_NOT_SUPPORTED',
      error: '喜马拉雅平台暂未支持，敬请期待！', // 临时提示
    };
  } else if (hostname.includes('lizhi.fm')) {
    console.log('[云函数] 识别到荔枝FM播客链接。');
    // parserResult = await lizhiParser.parse(episodeUrl, axios); // 待实现
    return {
      success: false,
      errorCode: 'PLATFORM_NOT_SUPPORTED',
      error: '荔枝FM平台暂未支持，敬请期待！', // 临时提示
    };
  } else if (hostname.includes('podcasts.apple.com') || hostname.includes('podcasts.google.com')) { // 考虑 Google Podcasts
    console.log('[云函数] 识别到 Apple Podcasts 或 Google Podcasts 链接。');
    // parserResult = await applePodcastsParser.parse(episodeUrl, axios); // 待实现
    return {
      success: false,
      errorCode: 'PLATFORM_NOT_SUPPORTED',
      error: 'Apple/Google Podcasts 平台暂未支持，敬请期待！', // 临时提示
    };
  } else {
    // 未知平台
    console.log(`[云函数] 无法识别的播客平台: ${hostname}`);
    return {
      success: false,
      errorCode: 'UNKNOWN_PLATFORM',
      error: '抱歉，暂时不支持该播客平台。',
    };
  }

  // 3. 处理解析结果
  if (parserResult.success) {
    console.log(`[云函数] 成功提取到链接: ${parserResult.m4aUrl}`);
    console.log(`[云函数] 提取到标题: ${parserResult.title}`);
    return {
      success: true,
      m4aUrl: parserResult.m4aUrl,
      title: parserResult.title,
    };
  } else {
    // 解析失败
    console.log(`[云函数] 平台解析失败: ${parserResult.error}`);
    return {
      success: false,
      errorCode: parserResult.errorCode || 'PARSE_FAILED',
      error: parserResult.error || '解析服务暂时不可用，请稍后或反馈问题。',
    };
  }
};