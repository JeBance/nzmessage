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
			this.messages[message.hash] = timestamp;
			await this.DB.write('messages', message.hash, message.message);
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
		} catch(e) {
			console.log(e);
		}
	}

}

module.exports = nzmessage;
