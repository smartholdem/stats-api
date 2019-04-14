var express = require('express');
var router = express.Router();
const smartholdemApi = require('sthjs-wrapper');
const level = require('level');
const jsonReader = require('jsonfile');
const scheduler = require('node-schedule');
const db = level('.db', {valueEncoding: 'json'});

/**  SmartHoldem API init **/
smartholdemApi.setPreferredNode("192.168.1.55");
smartholdemApi.init("main"); //main or dev


// 0x0 - total tx count
// 0x1 - total uniq addresses
// 100x - tx count by day
// 200x - amount transfer by day
// 300x - price by day
// 400x - addresses by day
// 500x - list uniq addresses

const timeStart = 1511269200;
let dayKey = '20171121';
let totalAddresses = jsonReader.readFileSync('./count.json').addresses;

let options = {
    txOffset: jsonReader.readFileSync('./count.json').offset,
    txLimit: 50,
};

let counters = {
    txDay: 0,
    amountDay: 0,
    addrsDay: 0
};


async function syncInit() {

    scheduler.scheduleJob("*/20 * * * * *", () => {
        let parameters = {
            "limit": options.txLimit,
            "offset": options.txOffset,
            "orderBy": "timestamp:asc"
        };

        smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
            if (success && response.success === true) {
                for (let i = 0; i < response.transactions.length; i++) {
                    let date = new Date((timeStart + response.transactions[i].timestamp) * 1000);
                    let y = date.getFullYear().toString();
                    let m = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1).toString();
                    let d = date.getDate() < 10 ? '0' + date.getDate() : date.getDate().toString();
                    let ymd = y + m + d;

                    if (dayKey !== ymd) {
                        console.log(ymd);
                        dayKey = ymd;
                        counters.txDay = 0;
                        counters.amountDay = 0;
                        counters.addrsDay = 0;
                        db.put('400x' + ymd, {
                            addresses: 0
                        });
                    }

                    // verif addr
                    db.get('500x' + response.transactions[i].recipientId, function (err, value) {
                        if (err) {
                            totalAddresses++;
                            counters.addrsDay++;

                            // uniq addrs
                            db.put('0x1', {
                                addresses: totalAddresses
                            });

                            // addrs by day
                            db.put('400x' + dayKey, {
                                addresses: counters.addrsDay
                            });

                            // list uniq addrs
                            db.put('500x' + response.transactions[i].recipientId, {
                                timestamp: response.transactions[i].timestamp
                            })
                        }
                    });

                    counters.txDay++;
                    counters.amountDay = (counters.amountDay + (response.transactions[i].amount / 10 ** 8));

                    db.put('100x' + dayKey, {
                        tx: counters.txDay
                    });

                    // console.log((counters.amountDay).toPrecision(16));
                    db.put('200x' + dayKey, {
                        amount: counters.amountDay
                    });

                }
                options.txOffset = options.txOffset + options.txLimit;
                console.log('offset', options.txOffset);
                console.log('totalAddresses', totalAddresses);

                jsonReader.writeFile('./count.json', {
                    "offset": options.txOffset,
                    "addresses": totalAddresses
                });


                // save totalTxs
                db.put('0x0', {
                    tx: response.count,
                    offset: options.txOffset
                });
            } else {
                console.log('err', error);
            }
        });
    });
}


class apiController {
    async getDb(from, to) {
        return new Promise((resolve, reject) => {
            let list = {};
            let path = {
                gte: from + "x",
                lt: to + "x",
                limit: 5000
            };
            db.createReadStream(path)
                .on('data', function (data) {
                    list[data.key] = data.value;
                })
                .on('error', function (err) {
                    reject(err);
                })
                .on('end', function () {
                    resolve(list);
                });
        });
    }

    async getTxByDay(from, to) {
        return new Promise((resolve, reject) => {
            let list = [];
            let path = {
                gte: "100x" + from,
                lt: "100x" + to,
                limit: 5000
            };
            db.createReadStream(path)
                .on('data', function (data) {
                    list.push(data.value.tx);
                })
                .on('error', function (err) {
                    reject(err);
                })
                .on('end', function () {
                    resolve(list);
                });
        });
    }

    async getAmoutByDay(from, to) {
        return new Promise((resolve, reject) => {
            let list = [];
            let path = {
                gte: "200x" + from,
                lt: "200x" + to,
                limit: 5000
            };
            db.createReadStream(path)
                .on('data', function (data) {
                    list.push(data.value.amount);
                })
                .on('error', function (err) {
                    reject(err);
                })
                .on('end', function () {
                    resolve(list);
                });
        });
    }

    async getAccountsByDay(from, to) {
        return new Promise((resolve, reject) => {
            let list = [];
            let path = {
                gte: "400x" + from,
                lt: "400x" + to,
                limit: 5000
            };
            db.createReadStream(path)
                .on('data', function (data) {
                    list.push(data.value.addresses);
                })
                .on('error', function (err) {
                    reject(err);
                })
                .on('end', function () {
                    resolve(list);
                });
        });
    }
}


const API = new apiController();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.json('ok');
});

router.get('/data/:from/:to', function (req, res, next) {
    API.getDb(req.params["from"], req.params["to"]).then(function (data) {
        res.json(data);
    })
});

router.get('/tx/days/:from/:to', function (req, res, next) {
    API.getTxByDay(req.params["from"], req.params["to"]).then(function (data) {
        res.json(data);
    })
});

router.get('/amount/days/:from/:to', function (req, res, next) {
    API.getAmoutByDay(req.params["from"], req.params["to"]).then(function (data) {
        res.json(data);
    })
});

router.get('/accounts/days/:from/:to', function (req, res, next) {
    API.getAccountsByDay(req.params["from"], req.params["to"]).then(function (data) {
        res.json(data);
    })
});


syncInit();

module.exports = router;
