import {Request, Response} from 'express';
import * as smartholdemApi from 'sthjs-wrapper';
import * as level from 'level';
import * as scheduler from 'node-schedule';

const db = level('.db', {valueEncoding: 'json'});

/**  SmartHoldem API init **/
smartholdemApi.setPreferredNode("192.168.1.55");
smartholdemApi.init("main"); //main or dev

// 0x - total tx count
// 1x - uniq addresses
// 100x - tx count by day
// 200x - amount transfer by day
// 300x - price by day
// 400x - addresses by day

const timeStart = 1511269200;
let dayKey = '20171121';

let options = {
    txOffset: 0,
    txLimit: 50,
};

let counters = {
    txDay: 0,
    amountDay: 0,
    addrsDay: 0
};

// async function always returns a Promise
async function syncInit(): Promise<void> {
    await scheduler.scheduleJob("*/5 * * * * *", () => {

    });

    let parameters = {
        "limit": options.txLimit,
        "offset": options.txOffset,
        "orderBy": "height:asc"
    };

    smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
        for (let i = 0; i < response.transactions.length; i++) {
            if (response.transactions[i].amount > 0) {
                let date = new Date((timeStart + response.transactions[i].timestamp) * 1000);
                let ymd = date.getFullYear().toString() + (date.getMonth() + 1).toString() + date.getDate().toString();

                if (dayKey !== ymd) {
                    dayKey = ymd;
                    counters.txDay = 0;
                    counters.amountDay = 0;
                }

                // verif addr
                db.get('1x' + response.transactions[i].recipientId, function (err, value) {
                    if (err) {
                        db.put('1x' + response.transactions[i].recipientId, {
                            timestamp: response.transactions[i].timestamp
                        })
                    }
                });

                counters.txDay++;
                counters.amountDay = counters.amountDay + (response.blocks[i].totalAmount / 10 ** 8)

                console.log(date);
                console.log(ymd);

                db.put('0x100' + dayKey, {
                    count: counters.txDay
                });

                db.put('0x200' + dayKey, {
                    amount: counters.amountDay
                });
            }
        }
        options.txOffset = options.txOffset + options.txLimit;

        // save totalTxs
        db.put('0x0', {
            count: response.count
        });
    });

}

export default class IndexController {
    public index(req: Request, res: Response, next: Function): void {
        res.render('index', {title: 'SmartHoldem Stats'});
    }

    public msg(req: Request, res: Response): void {
        res.json({msg: 'Hello!'});
    }

    public getBlock(req: Request, res: Response): void {
        let parameters = {
            "limit": 10,
            "offset": 0,
            "orderBy": "height:asc"
        };
        smartholdemApi.getBlocks(parameters, (error, success, response) => {
            res.json(response);
        });
    }

    public getTxTotal(req: Request, res: Response): void {
        let parameters = {
            "limit": 1,
            "offset": 0
        };
        smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
            res.json({count: response.count});
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
