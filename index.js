const nzfsdb = require('nzfsdb');
const { getHASH, hasJsonStructure } = require('nzfunc');

class nzmessage {
	CONFIG;
	list;
	messages;

	constructor(CONFIG) {
		this.CONFIG = CONFIG;
		this.list = {};
		this.messages = {};
		try {
			if (this.CONFIG.db !== undefined) {
				let DB = new nzfsdb(this.CONFIG.db);
				if (!DB.checkExists()) throw new Error('DB folder does not exist');
				this.DB = DB;
				if (!this.DB.checkExists(null, 'messages.json')) throw new Error('messages.json does not exist');
				let messages = this.DB.read(null, 'messages.json');
				if (hasJsonStructure(messages)) this.list = JSON.parse(messages);
				if (this.CONFIG.log) console.log(this.list);
			}
		} catch(e) {
			if (this.CONFIG.log) console.log(e);
		}
	}

	async add(message = { hash: 'somehash', timestamp: '1731683656118', message: 'PGP message' } ) {
		try {
			this.list[message.hash] = message.timestamp;
			if (this.DB !== undefined) {
				this.DB.write(null, 'messages.json', JSON.stringify(this.list));
				this.DB.write('messages', message.hash, message.message);
			} else {
				this.messages[message.hash] = message.message;
			}
			if (this.CONFIG.log) console.log('\x1b[1m%s\x1b[0m', 'New message:', message.hash);
		} catch(e) {
			if (this.CONFIG.log) console.log(e);
		}
	}

	async remove(keyID) {
		try {
			if (this.CONFIG.log) console.log('\x1b[1m%s\x1b[0m', 'Message removed:', keyID);
			delete this.list[keyID];
			if (this.DB !== undefined) {
				this.DB.delete('messages', keyID);
				this.DB.write(null, 'messages', JSON.stringify(this.list));
			} else {
				delete this.messages[keyID];
			}
		} catch(e) {
			if (this.CONFIG.log) console.log(e);
		}
	}

	async getMessage(keyID) {
		try {
			if (!keyID || !this.list[keyID]) throw new Error('Unknown keyID');
			let message = {
				hash: keyID,
				timestamp: this.list[keyID]
			}
			if (this.DB !== undefined) {
				message.message = this.DB.read('messages', keyID);
				if (!message.message) throw new Error('Message not exists - ', keyID);
			} else {
				message.message = this.messages[keyID];
			}
			return message;
		} catch(e) {
			if (this.CONFIG.log) console.log(e);
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
			if (this.CONFIG.log) console.log(e);
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
			if (this.CONFIG.log) console.log(e);
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
			let result = { hash: keys[0], timestamp: this.list[keys[0]]};
			return result;
		} else {
			return false;
		}
	}

	getLastMessageHash() {
		let keys = Object.keys(this.list);
		if (keys.length > 0) {
			let last = keys.length - 1;
			let result = { hash: keys[last], timestamp: this.list[keys[last]]};
			return result;
		} else {
			return false;
		}
	}

	async autoDel() {
		// auto delete message function
		this.CONFIG.autoDel = Number(this.CONFIG.autoDel);
		if (this.CONFIG.autoDel > 0) {
			if (this.CONFIG.log) console.log('Automatic message deletion enabled (' + this.CONFIG.autoDel + ' min)');
			let checkingMessages = setInterval(async () => {
				let currentTime = new Date().getTime();
				let keys = Object.keys(this.list);
				for (let i = 0, l = keys.length; i < l; i++) {
					if (this.hasExpired(this.list[keys[i]])) {
						this.remove(keys[i]);
					}
				}
			}, this.CONFIG.autoCheckMessages);
		}
	}

}

module.exports = nzmessage;
