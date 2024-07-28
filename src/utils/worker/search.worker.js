// RPageSearch search.worker.js

const collator = new Intl.Collator('zh-Hans-CN', {
    numeric: true,
});

onmessage = (dataList) => {
    let data = dataList.data[0];
    let keyword = dataList.data[1];
    let reg = new RegExp(keyword, 'ig');
    if (keyword == '' || keyword == '.') {
        return false;
    }
    resultList = data.map((item) => {
        return { ...item, content: item.content.replace(reg, (match) => `${match}`) };
    });

    postMessage(resultList);
};
