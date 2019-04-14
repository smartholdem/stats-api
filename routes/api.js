var express = require('express');
var router = express.Router();
const smartholdemApi = require('sthjs-wrapper');
const level = require('level');
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

async function syncInit() {
    const timeStart = 1511269200;
    let dayKey = '20171121';
    let totalAddresses = 27893;

    let options = {
        txOffset: 148650,
        txLimit: 50,
    };

    let counters = {
        txDay: 0,
        amountDay: 0,
        addrsDay: 0
    };

    scheduler.scheduleJob("*/30 * * * * *", () => {
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
                    counters.amountDay = counters.amountDay + (response.transactions[i].amount / 10 ** 8);

                    db.put('100x' + dayKey, {
                        tx: counters.txDay
                    });

                    db.put('200x' + dayKey, {
                        amount: counters.amountDay
                    });

                }
                options.txOffset = options.txOffset + options.txLimit;
                console.log('offset', options.txOffset);

                // save totalTxs
                db.put('0x0', {
                    tx: response.count
                });
            } else {
                console.log('err', error);
            }
        });
    });
}


class apiController {
    async getDb(from, to) {
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
                return (err);
            })
            .on('end', function () {
                return (list);
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

module.exports = router;
