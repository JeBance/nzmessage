const { doRequest,
		getResponse } = require('nzfunc');

class nzmessage {
	CONFIG;
	DB;
	messages;

	constructor(CONFIG, DB) {
		this.CONFIG = CONFIG;
		this.DB = DB;
		const messages = JSON.parse(this.DB.read(null, 'messages.json'));
		const type = Object.prototype.toString.call(messages);
		if (type === '[object Object]' || type === '[object Array]') {
			this.messages = messages;
		} else {
			this.messages = {};
		}
	}

	async add(message = { hash: 'somehash', timestamp: '1731683656118', message: 'PGP message' } ) {
		try {
			this.messages[message.hash] = message.timestamp;
			await this.DB.write('messages', message.hash, JSON.stringify(message));
			await this.DB.write(null, 'messages.json', JSON.stringify(this.messages));
			console.log('\x1b[1m%s\x1b[0m', 'New message:', message.hash + ':', message.timestamp);
		} catch(e) {
			console.log(e);
		}
	}

	async remove(keyID) {
		try {
			console.log('\x1b[1m%s\x1b[0m', 'Message removed:', keyID);
			await this.DB.delete('messages', keyID);
			delete this.messages[keyID];
			await this.DB.write(null, 'messages.json', JSON.stringify(this.messages));
		} catch(e) {
			console.log(e);
		}
	}

	async getMessage(keyID) {
		try {
			if (!keyID || !this.messages[keyID]) throw new Error();
			let message = JSON.parse(await this.DB.read('messages', keyID));
			return message;
		} catch(e) {
			return false;
		}
	}

	async checkMessageStructure(message = {}) {
		try {
			if ((message.hasOwnProperty('hash') === true)
			&& (message.hasOwnProperty('message') === true)
			&& (message.hasOwnProperty('timestamp') === true)
			&& ((await this.DB.validateName(message.hash)) === true)
			&& (Number.isInteger(message.timestamp))
			&& (message.hash === getHASH(message.message, 'md5'))) {
				return true;
			} else {
				return false;
			}
		} catch(e) {
			return false;
		}
	}

	async updateMessages(messages = {}, info = { host: '127.0.0.1', port: 28262 }, NODE) {
		try {
			let currentTime = new Date().getTime();
			let node = await NODE.getInfo({
				host: info.host,
				port: info.port
			});
			let inequal = currentTime - (node.time + node.ping);
			let message = {};
			let keys = Object.keys(messages);
			for (let i = 0, l = keys.length; i < l; i++) {
				if ((this.messages[keys[i]] === undefined)
				&& (!this.hasExpired(this.messages[keys[i]]))
				&& ((messages[keys[i]] + inequal) < currentTime)) {
					message = await NODE.getMessage(keys[i], { host: node.host, port: node.port });
					if (this.checkMessageStructure(message)) {
						await this.add({
							host: node.host,
							port: node.port,
							hash: message.hash,
							timestamp: message.timestamp,
							message: message.message
						});
					}
				}
			}
		} catch(e) {
			console.log(e);
		}
	}

	hasExpired(timestamp) {
		if (this.CONFIG.autoDel !== undefined
		&& typeof this.CONFIG.autoDel === 'number'
		&& this.CONFIG.autoDel > 0) {
			let currentTime = new Date().getTime();
			if (timestamp < (currentTime - this.CONFIG.autoDel*60*1000)) {
				return true;
			}
		}
		return false;
	}

}

module.exports = nzmessage;
