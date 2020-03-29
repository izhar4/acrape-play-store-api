const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const constConfig = require('./config/constants');
const fs = require('fs');
const app = express();
const cors = require('cors');


app.use(cors({
    origin: 'http://localhost:4200'}))
const storeBaseUrl = constConfig.storeBaseUrl;
const urlToScarp = constConfig.urlToScarp;


app.get('/appList', async (req, res) => {
    try {
        const appList = await readFileData();
        res.status(200).json({data: appList});
    } catch (error) {
        sendErrorResp(res);
    }

});


app.get('/', async (req, res) => {
    try {
        const listHtml = await getAxiosData(urlToScarp);
        const $ = cheerio.load(listHtml.data);
        let listData = getListData($);
        // writeListData(listData);
        listData = await getDetailsData(listData);
        writeListData(listData);
        res.status(200).json({data: listData});
    } catch (error) {
        console.log(error)
        sendErrorResp(res);
    }
});

getAxiosData = async (urlToScarp) => {
    return axios.get(urlToScarp);
}

getListData = ($) => {
    const appData = [];
    $('#i9')
        .prev('div').find('div')
        .filter('.ImZGtf.mpg5gc')
        .each((index, elem) => {
            const icon = $(elem).find('img')
                .filter('.T75of.QNCnCf').attr('data-src');
            const nameDeveloperDiv = $(elem).find('div').filter('.kCSSQe');
            let appObj = {
                icon,
                images: []
            };
            const playStoreId = `${storeBaseUrl}${$(elem).find('div.wXUyZd > a').attr('href')}`;
            $(nameDeveloperDiv).find('a>div').each((nameDivIndex, nameElem) => {
                if (!nameDivIndex) {
                    appObj = { ...appObj, name: $(nameElem).text() };
                } else if (nameDivIndex === 1) {
                    appObj = { ...appObj, developerName: $(nameElem).text() }
                }
            })
            appData.push({ ...appObj, playStoreId });
        });

    return appData;

}

writeListData = (listData) => {
    console.log(listData)
    let data = JSON.stringify(listData);
    fs.writeFile('apps.json', data, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
}

readFileData = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('apps.json', (err, data) => {
            if (err) reject(err);
            let fileData = JSON.parse(data);
            resolve(fileData);
        });
    });

}

sendErrorResp = (res) => {
    res.status(500).json({ message: 'something went wrong, please try again' });
}

getDetailsData = async (listData) => {
    const detailPromise = [];
    listData.forEach(data => {
        detailPromise.push(axios.get(data.playStoreId));
    });

    const detailPromiseArr = await Promise.all(detailPromise);
    detailPromiseArr.forEach((appDetailHtml, detailIndex) => {
        const detail$ = cheerio.load(appDetailHtml.data);
        detail$('div.SgoUSc').children('button.Q4vdJd').each((index, elem) => {
            const imageSrc = detail$(elem).find('img').filter('.T75of.DYfLw').attr('data-src');
            if (imageSrc) {
                listData[detailIndex].images.push(imageSrc);
            }
        })
    });
    return listData;
}

app.listen(8081, () => {

    console.log('App listening at port 8081');
});