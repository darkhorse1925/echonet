import 'express-async-errors'
import cors from 'cors'
import {createServer} from 'http'
import express from 'express'
import  {Server} from 'socket.io'
import {URL} from 'url'
import {readFile, writeFile} from 'fs'

import login from './login.js'
import customError from './customError.js'
import verifyToken from './verifyToken.js'

const __dirname = new URL('.', import.meta.url).pathname
const app = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(express.static('client'))

app.get('/',(req,res)=>{
	res.sendFile(__dirname + '/client/index.html')
})

app.get('/login',(req,res)=>{
	res.sendFile(__dirname + '/client/login.html')
})

app.post('/login', login)

app.get('/users',(req,res)=>{
	res.sendFile(__dirname + '/client/index.html')
})

let dbStatus= [] // this value gets stored read once write many
let status= [] // shows if user online, read and write many
readFile(__dirname + '/db.json', 'utf8', (err, result) =>{
	if(err){
		console.log(err)
	} else {
		dbStatus = JSON.parse(result)
		status= dbStatus.map((d) => {
			return {name: d.name, last_seen: d.last_seen, profile: d.img}})
	}
})

let messages = []
function getMessages() {
	readFile(__dirname + '/messages.json', 'utf8', (err,result)=>{
		if (err)
			console.log(err)
		messages = JSON.parse(result)
	})
}
getMessages()

/*~~~~~~~~~= SOCKETIO START =~~~~~~~~~*/

const io = new Server(server)

//Socketio auth middleware
io.use((socket, next) => {
	if(socket.handshake.auth.token){
		const payload = verifyToken(socket.handshake.auth.token)
		socket.user = payload.username
		next()
	} else {
		next(new Error('thou shall not pass, no token!'))
		// next is to be called or client will continue to send requests until a set timeout
	}
})


//save messages to database
function saveMessages(message) {
	if (messages.length > 100) {
		messages.shift()
	}
	messages.push(message)
		writeFile(__dirname + '/messages.json', JSON.stringify(messages), (err, result)=> {
			if (err)
				console.log(err)
		})
}

//name spaces are logical connections and connection is always set at port 8080 irrespective of path; '/' is the default nsp
io.of('/').on('connection', socket => {

	/*sends dashboard details*/ 
	status = status.map((s) => {
		if (s.name === socket.user) {
			s.last_seen = 10000000000000 //  represents Online
		}
		return s
	})
	socket.emit('welcome',socket.user)
	io.sockets.emit('dashboard-details', status)
	socket.broadcast.emit('someone-entered', socket.user) // remove this ~ dashboard does the job

	socket.emit('prev_messages', messages)
	socket.emit('scroll', "please scroll") //testing

	
	//Send if user is TYPING 
	socket.on('typing', (data) => {
		if(data) {
			socket.broadcast.emit('on-typing', socket.user)
		} else {
			socket.broadcast.emit('off-typing', socket.user)
		}
	})

	/*Receive message from user and broadcast*/ 
	socket.on('user-message', data => {
		let msgBroadcast =  {name: socket.user, msg: data, time: Date.now()}
		socket.broadcast.emit('other-message', msgBroadcast)
		saveMessages(msgBroadcast)
	})


	/*on DISCONNECT*/ 
	socket.on('disconnect', () => {
		let lastSeen= Date.now()
		status = status.map((s) =>  {
			if(s.name === socket.user ) {
				s.last_seen =  lastSeen
			}
			return s
		})
		dbStatus= dbStatus.map((s) =>  {
			if(s.name === socket.user ) {
				s.last_seen = lastSeen
			}
			return s
		})
		writeFile(__dirname+'/db.json', JSON.stringify(dbStatus), (err, result)=>{
			if(err) {
				console.log(err)
			} 
			socket.broadcast.emit('dashboard-details', status)
			socket.broadcast.emit('user-disconnect', socket.user) // useless 
		})
	})
})

/*~~~~~~~~~= SOCKETIO END =~~~~~~~~~*/

function errorHandler (err, req, res, next){
	console.log(err) //testing
	if(err instanceof customError) {
		const msg = err.message
		const status = err.status || 500
		res.status(status).json({msg})
	} else {
		res.status(500).json({msg: "Oops! Something went wrong!"})
	}
}

app.use(errorHandler)

/*listen*/
server.listen(8080,()=>{
	console.log('server listening at 8080...')
})


