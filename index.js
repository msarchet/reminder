const express = require('express')
const app = express()
const http = require('http')
const bodyParser = require('body-parser')
const server = http.createServer(app)
const sql = require('sqlite3').verbose()
let dbStarted = false;
const startup = () => {
	if (!dbStarted)
	{
		console.log(`Startup Error: Database not started succesfully`)
	}

	let tableCreation = new Promise((resolve, reject) => {
		db.run(`
			CREATE TABLE IF NOT EXISTS reminders
				(id INTEGER PRIMARY KEY AUTOINCREMENT,
				owner TEXT,
				name TEXT,
				lasttime REAL,
				interval REAL,
				deleted INTEGER default 0)
		`, err => {
			if (err) 
			{ 
				reject(err) 
				return
			}
			resolve()
		})
	})

	tableCreation.then(
		_ => 
		{ 
			app.listen(process.env.PORT || 8080, _ => console.log('server ready'))
		}, 
		err =>  
		{
			console.log(`Startup Error on db creation ${err}`) 
			process.exit(-1)
		}
	)
}

let insertReminder = ({owner, reminderName, lastTime, interval}) => {
	return new Promise((resolve, reject) => {
		db.run(`
			INSERT INTO reminders (owner, name, lasttime, interval)
				VALUES (?, ? , ? , ?)
		`, [owner, reminderName, lastTime, interval],
			err => {

				if (err) { 
					reject(err)
					return
				}
				resolve({id: this.lastID})
			}
		)
	})
}

let getReminders = ({owner}) => {
	return new Promise((resolve, reject) => {
		console.log("running query")
		db.all(`SELECT id, name, lasttime, interval
			FROM reminders WHERE owner == ? and deleted == 0`,
			[owner],
			(err, result) => {
				if (err) {
					reject(err)
					return
				}
				resolve(result)
			}
		)
	})
}

let getSpecificReminder = ({owner, id}) => {
	return new Promise((resolve, reject) => {
		db.get(`SELECT (id, name, lasttime, interval)
			FROM reminders WHERE owner == ? and id == ? and deleted == 0`,
			[owner, id],
			(err, result) => {
				if (err) {
					reject(err)
					return
				}

				resolve(result)
			})
	})
}

let deleteReminder = ({owner, id}) => {
	return new Promise((resolve, reject) => {
		db.run(`UPDATE reminders 
				SET deleted = 1
				where owner == ? and id == ?`,
			[owner, id],
			(err, result) => {
				if (err) {
					reject(err)
					return
				}

				resolve(result)
			})
	})
}

app.use(express.static('public'))
app.use(bodyParser.json())

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'))

app.get('/reminders', (req, res) => {
	let {owner} = req.body
	if (!owner) {
		res.status(500).send("Bad Request requires owner")
		return
	}

	getReminders({owner})
		.then(result => res.status(200).send(result))
		.catch(failure => {
			console.log(`Error getting reminders ${failure}`)
			res.status(500).send("Failed to get reminders")
			return
		})
})

app.get('/reminder/{id}', (req, res) => {
	let {owner} = req.body
	let {id} = req.params
	if (!owner || !id) {
		res.status(500).send("Bad Request requires owner")
		return
	}

	getSpecificReminder({owner, id})
		.then(result => res.status(200).send(result))
		.catch(failure => {
			console.log(`Error getting a reminder ${failure}`)
			res.status(500).send("Failed to get reminder")
			return
		})
})

app.delete('/reminder/:id', (req, res) => {
	let { owner } = req.body
	let { id } = req.params

	if (!owner || id == null)
	{
		res.status(500).send("Bad Request: Invalid Parameter")
		return
	}

	deleteReminder({owner, id})
		.then(success => res.status(200).send(success))
		.catch(failure => {
			console.log(`Failed to delete reminder ${failure}`)
			res.status(500).send(`Failed to delete reminder ${id}`)
		})
})

app.put('/reminder', (req, res) => {
	let { owner, reminderName, lastTime, interval } = req.body

	if (!owner || !reminderName || lastTime == null || interval == null)
	{
		res.send(500, `Bad Request: Missing Parameter ${owner} ${reminderName} ${lastTime} ${interval}`)
		return
	}

	insertReminder({ owner, reminderName, lastTime, interval})
		.then(success => {
			console.log('done insert')
			res.status(200).send({success})
		})
		.catch(failure => {
			console.log(`Failed to put reminder ${failure}`)
			res.status(500).send(`Failed to insert reminder`)
		})
})

const db = new sql.Database("./db/reminders.db", err =>  { 
	if (err)  {
		console.log(`SQL Error: ${err}`) 
	}
	dbStarted = true
	startup()
})