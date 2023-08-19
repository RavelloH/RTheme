console.log('[RPageSearch] V2');
console.log('载入模块中...');

const fs = require('fs');
const cheerio = require('cheerio');

// 配置区
const articlesFolder = '../articles/'; // 文章根目录
const articlesFileName = 'index.html'; // 文档文件名
const savePath = '../assets/data/search.json';
// 选择器
const articlesName = '#articles-header h2 a'; // 文章标题元素
const articlesUrl = '#articles-header h2 a'; // 文章链接元素
const articlesTime = '#articles-header .articles-info time'; // 文章时间元素
const articlesClass = '#articles-header .articles-info .class a'; // 文章分类元素
const articlesTag = '#articles-header .articles-tags a'; // 文章标签元素
const articlesBody = '#articles-body'; // 文章正文元素
const articlesImages = '#articles-body img'; // 文章图片元素
const articlesLinks = '#articles-body a'; // 文章外链元素
const articlesTitle =
    '#articles-body h2 , #articles-body h3 , articles-body h4 , articles-body h5 , articles-body h6'; // 文章小标题元素

let fileStructure = [];
let fileList = [];
let objectStructure = {};
let objectStructureList = [];
let json;

console.log('[RPageSearch] LOADED');
console.log('获取文件树中...');

function fileRead(name) {
    data = fs.readFileSync(`${articlesFolder}${name}/${articlesFileName}`);
    fileParse(data);
}

function HTMLEncode(str) {
    var s = '';
    if (str.length == 0) return '';
    s = str.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/ /g, '&nbsp;');
    s = s.replace(/\'/g, '&#39;');
    s = s.replace(/\"/g, '&quot;');
    s = s.replace(/\n/g, '<br/>');
    return s;
}

function fileParse(file) {
    let cla = [];
    let tag = [];
    let title = [];
    let img = [];
    let links = [];
    let name, url, time, context;

    const $ = cheerio.load(file, {
        ignoreWhitespace: true,
    });
    name = $(articlesName).text();
    url = $(articlesUrl).attr('href');
    time = $(articlesTime).text();
    $(articlesClass).each(function (i, e) {
        cla.push($(e).text().toLowerCase());
    });

    $(articlesTag).each(function (i, e) {
        tag.push($(e).text().toLowerCase());
    });

    context = HTMLEncode($(articlesBody).text().replace(/\s+/g, '&nbsp;').replace(/\n|\r/g, ' '));
    $(articlesTitle).each(function (i, e) {
        title.push($(e).text().toLowerCase().replace(/\s+/g, '').replace(/\n|\r/g, ''));
    });
    $(articlesImages).each(function (i, e) {
        if ($(e).attr('src').indexOf('http') == -1 && $(e).attr('src').indexOf('articles') == -1) {
            img.push($(articlesUrl).attr('href') + $(e).attr('src'));
        } else {
            img.push($(e).attr('src'));
        }
    });
    $(articlesLinks).each(function (i, e) {
        if (typeof $(e).attr('href') !== 'undefined' && $(e).attr('href')[0] !== '#') {
            links.push($(e).attr('href'));
        }
    });
    fileStructure.push([name, url, time, cla, tag, title, context, img, links]);
    packer(name);
}

fs.readdir(articlesFolder, (err, data) => {
    if (err) {
        console.log(err);
    } else {
        console.log('读取目录成功，共发现' + data.length + '个文件');
        fileList = [];
        data.forEach((e) => {
            if (/^\d+$/.test(e)) {
                fileList.push(e);
            }
        });
        fileList.sort((a, b) => b - a);
        fileList.forEach((e) => {
            fileRead(e);
        });
    }
});

function objectCreater(arr) {
    this.name = arr[0];
    this.url = arr[1];
    this.time = arr[2];
    this.class = arr[3];
    this.tag = arr[4];
    this.title = arr[5];
    this.context = arr[6];
    this.img = arr[7];
    this.links = arr[8];
}

function packer(e) {
    console.log(`文章'${e}'已完成索引`);
    if (fileList.length == fileStructure.length) {
        fileStructure.forEach((e, index) => {
            objectStructure = new objectCreater(e);
            objectStructureList.push(objectStructure);
        });
        fs.writeFile(savePath, JSON.stringify(objectStructureList), (err) => {
            if (err) throw err;
            console.log('生成&写入成功');
        });
    }
}
