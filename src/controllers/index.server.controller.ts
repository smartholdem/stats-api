import {Request, Response} from 'express';
import * as smartholdemApi from 'sthjs-wrapper';
import * as level from 'level';

const db = level('.db', {valueEncoding: 'json'});

/**  SmartHoldem API init **/
smartholdemApi.setPreferredNode("192.168.1.55");
smartholdemApi.init("main"); //main or dev

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
            res.json(response.count);
        });
    }
}

export const indexController = new IndexController();
