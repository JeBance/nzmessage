const { getHASH,
		doRequest,
		getResponse } = require('nzfunc');

class nzmessage {
	CONFIG;
	list;
	messages;

	constructor(CONFIG) {
		this.CONFIG = CONFIG;
		this.list = {};
		this.messages = {};
	}

	async add(message = { hash: 'somehash', timestamp: '1731683656118', message: 'PGP message' } ) {
		try {
			this.list[message.hash] = message.timestamp;
			this.messages[message.hash] = message.message;
			console.log('\x1b[1m%s\x1b[0m', 'New message:', message.hash);
		} catch(e) {
			console.log(e);
		}
	}

	async remove(keyID) {
		try {
			console.log('\x1b[1m%s\x1b[0m', 'Message removed:', keyID);
			delete this.list[keyID];
			delete this.messages[keyID];
		} catch(e) {
			console.log(e);
		}
	}

	async getMessage(keyID) {
		try {
			if (!keyID || !this.list[keyID]) throw new Error('Unknown keyID');
			let message = {
				hash: keyID,
				timestamp: this.list[keyID],
				message: this.messages[keyID]
			}
			return message;
		} catch(e) {
			console.log(e);
			return false;
		}
	}

	async checkMessageStructure(message = {}) {
		try {
			if ((message.hasOwnProperty('hash') === true)
			&& (message.hasOwnProperty('message') === true)
			&& (message.hasOwnProperty('timestamp') === true)
			&& (Number.isInteger(message.timestamp))
			&& (message.hash === await getHASH(message.message, 'md5'))) {
				return true;
			} else {
				throw new Error('Incorrect message structure');
			}
		} catch(e) {
			console.log(e);
			return false;
		}
	}

	async updateMessages(messages = {}, info = { prot: 'http', host: '127.0.0.1', port: 28262 }, NODE) {
		try {
			let currentTime = new Date().getTime();
			let node = await NODE.getInfo({
				prot: info.prot,
				host: info.host,
				port: info.port
			});
			let inequal = currentTime - (node.time + node.ping);
			let message = {};
			let keys = Object.keys(messages);
			if (keys.length > 0) for (let i = 0, l = keys.length; i < l; i++) {
				if ((this.list[keys[i]] === undefined)
				&& (!this.hasExpired(messages[keys[i]]))
				&& ((messages[keys[i]] + inequal) < currentTime)) {
					message = await NODE.getMessage(keys[i], { prot: node.prot, host: node.host, port: node.port });
					if ((this.checkMessageStructure(message))
					&& (this.list[keys[i]] === undefined)) {
						await this.add({
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

	getFirstMessageHash() {
		let keys = Object.keys(this.list);
		if (keys.length > 0) {
			return keys[0];
		} else {
			return false;
		}
	}

	getLastMessageHash() {
		let keys = Object.keys(this.list);
		if (keys.length > 0) {
			let last = keys.length - 1;
			return keys[last];
		} else {
			return false;
		}
	}


}

module.exports = nzmessage;
