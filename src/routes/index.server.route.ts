import { Express } from 'express';
import { indexController } from '../controllers/index.server.controller';

export default class IndexRoute {
	constructor(app: Express) {
		app.route('/')
			.get(indexController.index);
		app.route('/msg')
			.get(indexController.msg);
		app.route('/block')
			.get(indexController.getBlock);
        app.route('/tx-total')
            .get(indexController.getTxTotal);
	}
}
