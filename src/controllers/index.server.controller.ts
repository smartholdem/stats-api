import {Request, Response} from 'express';
import * as smartholdemApi from 'sthjs-wrapper';
import * as level from 'level';
import * as scheduler from 'node-schedule';

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

// async function always returns a Promise
async function syncInit(): Promise<void> {
    const timeStart = 1511269200;
    let dayKey = '20171121';
    let totalAddresses = 0;

    let options = {
        txOffset: 0,
        txLimit: 50,
    };

    let counters = {
        txDay: 0,
        amountDay: 0,
        addrsDay: 0
    };

    scheduler.scheduleJob("*/6 * * * * *", () => {
        let parameters = {
            "limit": options.txLimit,
            "offset": options.txOffset,
            "orderBy": "height:asc"
        };

        smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
            if (success && response.success) {
                for (let i = 0; i < response.transactions.length; i++) {
                    let date = new Date((timeStart + response.transactions[i].timestamp) * 1000);
                    let ymd = date.getFullYear().toString() + (date.getMonth() + 1).toString() + date.getDate().toString();

                    if (dayKey !== ymd) {
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

export default class IndexController {
    public index(req: Request, res: Response, next: Function): void {
        res.render('index', {title: 'SmartHoldem Stats'});
    }

    public getTxTotal(req: Request, res: Response): void {
        console.log(req);
        let parameters = {
            "limit": 1,
            "offset": 0
        };
        smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
            res.json({count: response.count});
        });
    }

    public getDb(req: Request, res: Response): void {
        let list = {};
        db.createReadStream({gte: req.params["from"] + "x", lt: req.params["to"] + "x", limit: 10000})
            .on('data', function (data) {
                list[data.key] = data.value;
            })
            .on('error', function (err) {
                res.json(err);
            })
            .on('end', function () {
                res.json(list);
            });
    }

    public getTxList(req: Request, res: Response): void {
        let parameters = {
            "limit": 2,
            "offset": 0,
            "orderBy": "height:asc"
        };
        smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
            res.json(response);
        });
    }
}

syncInit();

export const indexController = new IndexController();
