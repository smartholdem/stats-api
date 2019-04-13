import {Request, Response} from 'express';
import * as smartholdemApi from 'sthjs-wrapper';
import * as level from 'level';
import * as scheduler from 'node-schedule';

const db = level('.db', {valueEncoding: 'json'});

/**  SmartHoldem API init **/
smartholdemApi.setPreferredNode("192.168.1.55");
smartholdemApi.init("main"); //main or dev

// 0x0 - total tx count
// 0x1 - uniq addresses
// 0x100 - tx count by day
// 0x200 - amount transfer by day
// 0x300 - price by day

let timeStart = 1511269200;
let dayKey = '20171121';

let options = {
    txOffset: 0,
    txLimit: 50,
    txDay: 0,
    amountDay: 0,
    addresses: 0
};

let parameters = {
    "limit": options.txLimit,
    "offset": options.txOffset,
    "orderBy": "height:asc"
};


// async function always returns a Promise
async function syncInit(): Promise<void> {
    await scheduler.scheduleJob("*/5 * * * * *", () => {

    });
}

smartholdemApi.getTransactionsList(parameters, (error, success, response) => {
    if (response.success) {

    }
    console.log(response.transactions);
});

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
