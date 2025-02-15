import log from './log';

function analyzeURL(url, target) {
    let urlObj = new URL(url);
    let queryString = urlObj.search;
    if (queryString === '') {
        return '';
    }
    let params = new URLSearchParams(queryString);
    let targetValue = params.get(target);
    if (targetValue === null) {
        return '';
    }
    log.info('<analyzeURL>', target, targetValue);
    return targetValue;
}

export default analyzeURL;
