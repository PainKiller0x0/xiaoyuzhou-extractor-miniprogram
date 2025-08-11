// cloudfunctions/extractM4a/parsers/lizhiParser.js
// 荔枝FM播客链接解析器 (待实现)

exports.parse = async (episodeUrl, axios) => {
  console.log(`[荔枝FM解析器] 收到链接: ${episodeUrl}`);
  // TODO: 在这里实现荔枝FM单集页面的抓取和音频链接、标题的提取逻辑
  // 这将需要分析荔枝FM网页的HTML结构。

  // 临时返回未支持状态
  return {
    success: false,
    errorCode: 'PARSER_NOT_IMPLEMENTED',
    error: '荔枝FM解析器功能尚未实现。',
  };
};