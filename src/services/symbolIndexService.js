const contentSymbolRepository = require('../repositories/contentSymbolRepository');
const { extractJavaSymbols } = require('../utils/javaSymbolExtractor');

function getContentId(content) {
  return content?.id || content?.content_id;
}

function getTopicId(content) {
  return content?.topic_id || content?.topicId;
}

function getCode(content) {
  return typeof content?.code === 'string' ? content.code : '';
}

async function indexContent(content) {
  const contentId = getContentId(content);
  const topicId = getTopicId(content);

  if (!contentId || !topicId) {
    return {
      contentId,
      topicId,
      symbolsIndexed: 0,
      skipped: true,
    };
  }

  const symbols = extractJavaSymbols(getCode(content));
  await contentSymbolRepository.replaceSymbolsForContent({
    contentId,
    topicId,
    symbols,
  });

  return {
    contentId,
    topicId,
    symbolsIndexed: symbols.length,
    skipped: false,
  };
}

async function indexAllJavaContents() {
  const contents = await contentSymbolRepository.getJavaContents();
  const indexed = [];

  for (const content of contents) {
    indexed.push(await indexContent(content));
  }

  const totalSymbols = indexed.reduce(
    (sum, item) => sum + item.symbolsIndexed,
    0
  );

  return {
    contentsScanned: contents.length,
    contentsIndexed: indexed.length,
    symbolsIndexed: totalSymbols,
  };
}

module.exports = {
  indexAllJavaContents,
  indexContent,
};
