import { Express } from 'express';
import { indexController } from '../controllers/index.server.controller';

export default class IndexRoute {
	constructor(app: Express) {
		app.route('/')
			.get(indexController.index);
        app.route('/tx-total')
            .get(indexController.getTxTotal);
		app.route('/tx')
			.get(indexController.getTxList);
		app.route('/data/:from/:to')
			.get(indexController.getDb);
	}
}
